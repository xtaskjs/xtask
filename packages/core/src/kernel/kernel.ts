import "reflect-metadata";
import { Container } from "@xtaskjs/core";
import { Logger } from "@xtaskjs/common";

export class Kernel {
 
    private container:Container;
    private logger:Logger;

    constructor(){
    }
    async boot(): Promise<void> {
        // Bootstrapping logic here
        this.container = new Container();
        // Autoload components from the "packages" directory
        await this.container.autoload("packages");

        this.logger = await this.container.get(Logger);
        // Simulate some async operation
        await new Promise((resolve) => setTimeout(resolve, 1000));
        this.logger.info("🚀 Kernel started successfully.");
    }

     async getContainer(): Promise<Container> {
        return this.container;
    }

    

}

