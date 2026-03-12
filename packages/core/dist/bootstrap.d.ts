import "reflect-metadata";
import { Kernel } from "./kernel/kernel";
import { CreateApplicationOptions, XTaskHttpApplication } from "./http";
export declare function Bootstrap(): Promise<Kernel>;
export declare function CreateApplication(options?: CreateApplicationOptions): Promise<XTaskHttpApplication>;
