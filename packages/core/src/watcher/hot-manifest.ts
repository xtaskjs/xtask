import { existsSync, statSync, watch, FSWatcher, readdirSync } from "fs";
import { isAbsolute, join, normalize } from "path";
import { Container } from "../di";
import { ManifestCacheService } from "../kernel/manifest-cache.service";

const isSourceFile = (value: string): boolean => /\.(ts|js)$/.test(value) && !/\.(test|spec)\.(ts|js)$/.test(value);

export interface HotManifestWatcherOptions {
    debounceMs?: number;
    log?: (message: string) => void;
    onHotUpdate?: (payload: HotManifestUpdateEvent) => void | Promise<void>;
    onMetrics?: (payload: HotManifestMetricsEvent) => void | Promise<void>;
    onReloadError?: (payload: HotManifestReloadErrorEvent) => void | Promise<void>;
}

export interface HotManifestMetricsSnapshot {
    filesHotUpdated: number;
    reloadErrors: number;
    averageUpdateMs: number;
    totalUpdateMs: number;
    lastUpdateMs: number;
}

export interface HotManifestUpdateEvent {
    file: string;
    components: string[];
    durationMs: number;
    metrics: HotManifestMetricsSnapshot;
}

export interface HotManifestMetricsEvent {
    source: "update" | "error";
    metrics: HotManifestMetricsSnapshot;
}

export interface HotManifestReloadErrorEvent {
    file: string;
    error: string;
    metrics: HotManifestMetricsSnapshot;
}

export class HotManifestWatcher {
    private readonly watchers = new Map<string, FSWatcher>();
    private readonly scanRoots: string[];
    private readonly trackedFiles = new Set<string>();
    private readonly debounceTimers = new Map<string, NodeJS.Timeout>();
    private readonly debounceMs: number;
    private readonly log: (message: string) => void;
    private readonly onHotUpdate?: (payload: HotManifestUpdateEvent) => void | Promise<void>;
    private readonly onMetrics?: (payload: HotManifestMetricsEvent) => void | Promise<void>;
    private readonly onReloadError?: (payload: HotManifestReloadErrorEvent) => void | Promise<void>;
    private filesHotUpdated = 0;
    private reloadErrors = 0;
    private totalUpdateMs = 0;
    private lastUpdateMs = 0;

    constructor(
        private readonly manifest: ManifestCacheService,
        private readonly container: Container,
        scanRoots: string[],
        initialFiles: string[],
        options: HotManifestWatcherOptions = {}
    ) {
        this.scanRoots = scanRoots.map((root) => normalize(root));
        initialFiles.forEach((file) => {
            this.trackedFiles.add(normalize(file));
        });
        this.debounceMs = options.debounceMs ?? 60;
        this.log = options.log ?? (() => undefined);
        this.onHotUpdate = options.onHotUpdate;
        this.onMetrics = options.onMetrics;
        this.onReloadError = options.onReloadError;
    }

    public getMetrics(): HotManifestMetricsSnapshot {
        const averageUpdateMs = this.filesHotUpdated > 0
            ? this.totalUpdateMs / this.filesHotUpdated
            : 0;

        return {
            filesHotUpdated: this.filesHotUpdated,
            reloadErrors: this.reloadErrors,
            averageUpdateMs,
            totalUpdateMs: this.totalUpdateMs,
            lastUpdateMs: this.lastUpdateMs,
        };
    }

    public start(): void {
        for (const root of this.scanRoots) {
            this.watchDirectoryTree(root);
        }
    }

    public stop(): void {
        for (const timeout of this.debounceTimers.values()) {
            clearTimeout(timeout);
        }
        this.debounceTimers.clear();

        for (const watcher of this.watchers.values()) {
            watcher.close();
        }
        this.watchers.clear();
    }

    private watchDirectoryTree(root: string): void {
        if (!existsSync(root) || !statSync(root).isDirectory()) {
            return;
        }

        this.ensureDirectoryWatcher(root);

        for (const child of readdirSync(root)) {
            const childPath = join(root, child);
            if (!existsSync(childPath)) {
                continue;
            }
            const stats = statSync(childPath);
            if (stats.isDirectory()) {
                this.watchDirectoryTree(childPath);
            }
        }
    }

    private ensureDirectoryWatcher(directory: string): void {
        const normalizedDirectory = normalize(directory);
        if (this.watchers.has(normalizedDirectory)) {
            return;
        }

        try {
            const watcher = watch(normalizedDirectory, (_eventType, filename) => {
                if (!filename) {
                    return;
                }
                const relativeName = filename.toString();
                const changedPath = normalize(join(normalizedDirectory, relativeName));
                this.onFsEvent(changedPath);
            });
            this.watchers.set(normalizedDirectory, watcher);
        } catch {
            // Best effort: if the directory cannot be watched, continue with the rest.
        }
    }

    private onFsEvent(changedPath: string): void {
        const existingTimer = this.debounceTimers.get(changedPath);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timeout = setTimeout(() => {
            this.debounceTimers.delete(changedPath);
            void this.processPathChange(changedPath);
        }, this.debounceMs);

        this.debounceTimers.set(changedPath, timeout);
    }

    private resolveAbsolutePath(pathValue: string): string {
        if (isAbsolute(pathValue)) {
            return normalize(pathValue);
        }
        return normalize(join(process.cwd(), pathValue));
    }

    private async processPathChange(rawPath: string): Promise<void> {
        const absolutePath = this.resolveAbsolutePath(rawPath);
        const startedAt = Date.now();

        try {
            await this.processPathChangeInternal(absolutePath, startedAt);
        } catch (error) {
            this.reloadErrors += 1;
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.log(`[xtask] Hot reload error in ${absolutePath}: ${errorMessage}`);
            await this.onReloadError?.({
                file: absolutePath,
                error: errorMessage,
                metrics: this.getMetrics(),
            });
            await this.onMetrics?.({
                source: "error",
                metrics: this.getMetrics(),
            });
        }
    }

    private async processPathChangeInternal(absolutePath: string, startedAt: number): Promise<void> {
        const currentlyExists = existsSync(absolutePath);
        if (currentlyExists && statSync(absolutePath).isDirectory()) {
            this.watchDirectoryTree(absolutePath);
            return;
        }

        const normalizedPath = normalize(absolutePath);
        const wasTracked = this.trackedFiles.has(normalizedPath);
        const shouldTrack = currentlyExists && isSourceFile(normalizedPath);

        if (!shouldTrack && !wasTracked) {
            return;
        }

        if (!currentlyExists || !shouldTrack) {
            const removedComponents = this.container.unregisterFile(normalizedPath);
            this.trackedFiles.delete(normalizedPath);
            this.manifest.removeFile(this.scanRoots, normalizedPath);
            if (removedComponents.length > 0) {
                this.log(`[xtask] Hot removed: ${removedComponents.join(", ")}`);
            }
            return;
        }

        this.log(`[xtask] Detected change in ${normalizedPath}, updating manifest...`);
        const updatedComponents = await this.container.hotReloadFile(normalizedPath);
        this.trackedFiles.add(normalizedPath);
        this.manifest.upsertFile(this.scanRoots, normalizedPath);
        const durationMs = Date.now() - startedAt;
        this.filesHotUpdated += 1;
        this.lastUpdateMs = durationMs;
        this.totalUpdateMs += durationMs;

        if (updatedComponents.length > 0) {
            this.log(`[xtask] Hot updated: ${updatedComponents.join(", ")}`);
        }

        if (updatedComponents.length === 0) {
            this.log(`[xtask] No component metadata found in ${normalizedPath}`);
        }

        await this.onHotUpdate?.({
            file: normalizedPath,
            components: updatedComponents,
            durationMs,
            metrics: this.getMetrics(),
        });
        await this.onMetrics?.({
            source: "update",
            metrics: this.getMetrics(),
        });
    }
}
