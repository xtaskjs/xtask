import "reflect-metadata";
import { existsSync } from "fs";
import { join } from "path";
import { Container } from "../di/container";
import { Logger } from "@xtaskjs/common";

export class Kernel {
 
    private container:Container;
    private logger:Logger;

    constructor(){
    }
    async boot(): Promise<void> {
        // Bootstrapping logic here
        this.container = new Container();

        const scanDirs = [
            join(process.cwd(), "src"),
            join(process.cwd(), "packages"),
            join(__dirname, "../../../common/src"),
        ];

        for (const dir of scanDirs) {
            if (existsSync(dir)) {
                await this.container.autoload(dir);
            }
        }

        this.logger = await this.container.get(Logger);
        // Simulate some async operation
        await new Promise((resolve) => setTimeout(resolve, 1000));
        this.logger.info("🚀 Kernel started successfully.");
    }

     async getContainer(): Promise<Container> {
        return this.container;
    }

    

}

