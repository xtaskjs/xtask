import "reflect-metadata";
import { existsSync } from "fs";
import { join } from "path";
import { Container, ContainerOptions } from "../di/container";
import { Logger } from "@xtaskjs/common";
import type { ApplicationLifeCycle } from "../server/application-lifecycle";
import { ManifestCacheService } from "./manifest-cache.service";
import { HotManifestWatcher } from "../watcher";

export interface KernelOptions {
    containerOptions?: ContainerOptions;
    hotManifestWatcher?: {
        enabled?: boolean;
        debounceMs?: number;
    };
}

export class Kernel {
 
    private container:Container;
    private logger:Logger;
    private manifestCache: ManifestCacheService;
    private readonly options: KernelOptions;
    private hotManifestWatcher?: HotManifestWatcher;

    constructor(options: KernelOptions = {}){
        this.options = options;
        this.manifestCache = new ManifestCacheService();
    }
    async boot(lifecycle?: ApplicationLifeCycle): Promise<void> {
        // Bootstrapping logic here
        this.container = new Container(this.options.containerOptions);

        const scanDirs = [
            join(process.cwd(), "src"),
            join(process.cwd(), "packages"),
            join(__dirname, "../../../common/src"),
        ];
        const existingScanDirs = scanDirs.filter((dir) => existsSync(dir));

        const rebuildManifest = async (): Promise<string[]> => {
            const scanResults = await Promise.all(existingScanDirs.map((dir) => this.container.scanDir(dir)));
            const files = [...new Set(scanResults.flat())];
            await this.container.autoloadFiles(files);
            this.manifestCache.write(existingScanDirs, files);
            await lifecycle?.emit("manifestCacheRebuilt", {
                roots: existingScanDirs,
                fileCount: files.length,
            });
            return files;
        };

        const manifest = this.manifestCache.read(existingScanDirs);

        let resolvedFiles: string[] = [];

        if (manifest) {
            await lifecycle?.emit("manifestCacheHit", {
                path: this.manifestCache.getManifestPath(),
                fileCount: manifest.files.length,
            });
            try {
                await this.container.autoloadFiles(manifest.files);
                resolvedFiles = manifest.files;
            } catch (error) {
                await lifecycle?.emit("manifestCacheInvalid", {
                    path: this.manifestCache.getManifestPath(),
                    reason: error instanceof Error ? error.message : String(error),
                });
                resolvedFiles = await rebuildManifest();
            }
        } else {
            await lifecycle?.emit("manifestCacheMiss", {
                path: this.manifestCache.getManifestPath(),
            });
            resolvedFiles = await rebuildManifest();
        }

        this.logger = await this.container.get(Logger);
        this.logger.info("🚀 Kernel started successfully.");

        const shouldEnableHotWatcher = this.options.hotManifestWatcher?.enabled
            ?? process.env.NODE_ENV === "development";

        if (shouldEnableHotWatcher) {
            this.hotManifestWatcher = new HotManifestWatcher(
                this.manifestCache,
                this.container,
                existingScanDirs,
                resolvedFiles,
                {
                    debounceMs: this.options.hotManifestWatcher?.debounceMs,
                    log: (message) => this.logger.info(message),
                    onHotUpdate: async (payload) => {
                        await lifecycle?.emit("hotManifestUpdated", payload);
                    },
                    onMetrics: async (payload) => {
                        await lifecycle?.emit("hotManifestMetrics", payload);
                    },
                    onReloadError: async (payload) => {
                        await lifecycle?.emit("hotManifestReloadError", payload);
                    },
                }
            );
            this.hotManifestWatcher.start();
            this.logger.info("[xtask] Hot manifest watcher enabled");
        }

        lifecycle?.on?.("stopping", async () => {
            this.hotManifestWatcher?.stop();
            this.hotManifestWatcher = undefined;
        });
    }

     async getContainer(): Promise<Container> {
        return this.container;
    }

    

}

