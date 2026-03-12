"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Kernel = void 0;
require("reflect-metadata");
const fs_1 = require("fs");
const path_1 = require("path");
const container_1 = require("../di/container");
const common_1 = require("@xtaskjs/common");
class Kernel {
    constructor() {
    }
    async boot() {
        // Bootstrapping logic here
        this.container = new container_1.Container();
        const scanDirs = [
            (0, path_1.join)(process.cwd(), "src"),
            (0, path_1.join)(process.cwd(), "packages"),
            (0, path_1.join)(__dirname, "../../../common/src"),
        ];
        for (const dir of scanDirs) {
            if ((0, fs_1.existsSync)(dir)) {
                await this.container.autoload(dir);
            }
        }
        this.logger = await this.container.get(common_1.Logger);
        this.logger.info("🚀 Kernel started successfully.");
    }
    async getContainer() {
        return this.container;
    }
}
exports.Kernel = Kernel;
