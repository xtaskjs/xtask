import { existsSync } from "fs";
import { join } from "path";
import { Container } from "../di";
import { ManifestCacheService } from "../kernel/manifest-cache.service";

export interface PrebuildManifestOptions {
    projectRoot?: string;
    scanRoots?: string[];
}

export interface PrebuildManifestResult {
    manifestPath: string;
    componentFiles: number;
    scanRoots: string[];
}

const resolveDefaultScanRoots = (projectRoot: string): string[] => [
    join(projectRoot, "src"),
    join(projectRoot, "packages"),
    join(projectRoot, "common", "src"),
    join(projectRoot, "packages", "common", "src"),
];

export async function prebuildManifest(options: PrebuildManifestOptions = {}): Promise<PrebuildManifestResult> {
    const projectRoot = options.projectRoot || process.cwd();
    const container = new Container();
    const manifestService = new ManifestCacheService(projectRoot);

    const candidateRoots = options.scanRoots || resolveDefaultScanRoots(projectRoot);
    const existingScanRoots = [...new Set(candidateRoots.filter((dir) => existsSync(dir)))];

    if (existingScanRoots.length === 0) {
        const manifest = manifestService.writePrebuilt([], []);
        return {
            manifestPath: manifestService.getPrebuiltManifestPath(),
            componentFiles: manifest.files.length,
            scanRoots: manifest.scanRoots,
        };
    }

    const scanResults = await Promise.all(existingScanRoots.map((dir) => container.scanDir(dir)));
    const files = [...new Set(scanResults.flat())];
    const manifest = manifestService.writePrebuilt(existingScanRoots, files);

    return {
        manifestPath: manifestService.getPrebuiltManifestPath(),
        componentFiles: manifest.files.length,
        scanRoots: manifest.scanRoots,
    };
}

if (require.main === module) {
    prebuildManifest()
        .then((result) => {
            console.log("[xtask:prebuild] Manifest generated", {
                path: result.manifestPath,
                componentFiles: result.componentFiles,
                scanRoots: result.scanRoots,
            });
        })
        .catch((error) => {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[xtask:prebuild] Failed: ${message}`);
            process.exitCode = 1;
        });
}
