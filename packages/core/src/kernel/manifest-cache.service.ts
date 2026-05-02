import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, normalize } from "path";

const XTASK_MANIFEST_VERSION = 1;
const XTASK_PREBUILT_MANIFEST_FILE = ".xtask-manifest.prebuilt.json";

export interface XTaskManifest {
    version: number;
    generatedAt: string;
    scanRoots: string[];
    files: string[];
}

export class ManifestCacheService {
    constructor(private readonly projectRoot = process.cwd()) {}

    public getManifestPath(): string {
        return join(this.projectRoot, ".xtask-manifest.json");
    }

    public getPrebuiltManifestPath(): string {
        return join(this.projectRoot, XTASK_PREBUILT_MANIFEST_FILE);
    }

    public read(scanRoots: string[]): XTaskManifest | null {
        const manifestPath = this.getManifestPath();
        return this.readFromPath(manifestPath, scanRoots);
    }

    public readPrebuilt(scanRoots: string[]): XTaskManifest | null {
        const manifestPath = this.getPrebuiltManifestPath();
        return this.readFromPath(manifestPath, scanRoots);
    }

    public writePrebuilt(scanRoots: string[], files: string[]): XTaskManifest {
        return this.writeToPath(this.getPrebuiltManifestPath(), scanRoots, files);
    }

    public write(scanRoots: string[], files: string[]): XTaskManifest {
        return this.writeToPath(this.getManifestPath(), scanRoots, files);
    }

    private readFromPath(manifestPath: string, scanRoots: string[]): XTaskManifest | null {
        if (!existsSync(manifestPath)) {
            return null;
        }

        try {
            const rawManifest = readFileSync(manifestPath, "utf8");
            const manifest = JSON.parse(rawManifest) as XTaskManifest;
            if (!this.isValid(manifest, scanRoots)) {
                return null;
            }
            return manifest;
        } catch {
            return null;
        }
    }

    private writeToPath(manifestPath: string, scanRoots: string[], files: string[]): XTaskManifest {
        const manifest: XTaskManifest = {
            version: XTASK_MANIFEST_VERSION,
            generatedAt: new Date().toISOString(),
            scanRoots: this.normalizeList(scanRoots),
            files: this.normalizeList(files),
        };

        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
        return manifest;
    }

    public upsertFile(scanRoots: string[], file: string): XTaskManifest {
        const current = this.read(scanRoots);
        const files = current ? [...current.files, file] : [file];
        return this.write(scanRoots, files);
    }

    public removeFile(scanRoots: string[], file: string): XTaskManifest {
        const current = this.read(scanRoots);
        const normalizedFile = normalize(file);
        const files = current
            ? current.files.filter((entry) => normalize(entry) !== normalizedFile)
            : [];
        return this.write(scanRoots, files);
    }

    private isValid(manifest: XTaskManifest, scanRoots: string[]): boolean {
        if (!manifest || manifest.version !== XTASK_MANIFEST_VERSION) {
            return false;
        }
        if (!Array.isArray(manifest.scanRoots) || !Array.isArray(manifest.files)) {
            return false;
        }
        const normalizedManifestRoots = this.normalizeList(manifest.scanRoots);
        const normalizedScanRoots = this.normalizeList(scanRoots);

        if (normalizedManifestRoots.length !== normalizedScanRoots.length) {
            return false;
        }

        return normalizedManifestRoots.every((value, index) => value === normalizedScanRoots[index]);
    }

    private normalizeList(values: string[]): string[] {
        return [...new Set(values.map((value) => normalize(value)))].sort();
    }
}