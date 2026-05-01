import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, normalize } from "path";

const XTASK_MANIFEST_VERSION = 1;

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

    public read(scanRoots: string[]): XTaskManifest | null {
        const manifestPath = this.getManifestPath();
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

    public write(scanRoots: string[], files: string[]): XTaskManifest {
        const manifestPath = this.getManifestPath();
        const manifest: XTaskManifest = {
            version: XTASK_MANIFEST_VERSION,
            generatedAt: new Date().toISOString(),
            scanRoots: this.normalizeList(scanRoots),
            files: this.normalizeList(files),
        };

        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
        return manifest;
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