import "reflect-metadata";
import { Container } from "../di/container";
export declare class Kernel {
    private container;
    private logger;
    constructor();
    boot(): Promise<void>;
    getContainer(): Promise<Container>;
}
