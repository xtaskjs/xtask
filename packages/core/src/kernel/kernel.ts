import "reflect-metadata";
import { existsSync } from "fs";
import { join } from "path";
import { Container } from "../di/container";
import { Logger } from "@xtaskjs/common";
import type { ApplicationLifeCycle } from "../server/application-lifecycle";
import { ManifestCacheService } from "./manifest-cache.service";

export interface KernelOptions {
    containerOptions?: ConstructorParameters<typeof Container>[0];
}

export class Kernel {
 
    private container:Container;
    private logger:Logger;
    private manifestCache: ManifestCacheService;
    private readonly options: KernelOptions;

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

        const rebuildManifest = async () => {
            const scanResults = await Promise.all(existingScanDirs.map((dir) => this.container.scanDir(dir)));
            const files = [...new Set(scanResults.flat())];
            await this.container.autoloadFiles(files);
            this.manifestCache.write(existingScanDirs, files);
            await lifecycle?.emit("manifestCacheRebuilt", {
                roots: existingScanDirs,
                fileCount: files.length,
            });
        };

        const manifest = this.manifestCache.read(existingScanDirs);

        if (manifest) {
            await lifecycle?.emit("manifestCacheHit", {
                path: this.manifestCache.getManifestPath(),
                fileCount: manifest.files.length,
            });
            try {
                await this.container.autoloadFiles(manifest.files);
            } catch (error) {
                await lifecycle?.emit("manifestCacheInvalid", {
                    path: this.manifestCache.getManifestPath(),
                    reason: error instanceof Error ? error.message : String(error),
                });
                await rebuildManifest();
            }
        } else {
            await lifecycle?.emit("manifestCacheMiss", {
                path: this.manifestCache.getManifestPath(),
            });
            await rebuildManifest();
        }

        this.logger = await this.container.get(Logger);
        this.logger.info("🚀 Kernel started successfully.");
    }

     async getContainer(): Promise<Container> {
        return this.container;
    }

    

}

