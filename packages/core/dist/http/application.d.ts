import { Kernel } from "../kernel";
import { ApplicationLifeCycle } from "../server";
import { HttpAdapter, HttpAdapterType, HttpServerOptions } from "./types";
export interface CreateApplicationOptions {
    adapter?: HttpAdapter | HttpAdapterType;
    adapterInstance?: any;
    server?: HttpServerOptions;
    autoListen?: boolean;
}
export declare class XTaskHttpApplication {
    private readonly adapter;
    private readonly lifecycle;
    private readonly kernel;
    constructor(params: {
        adapter: HttpAdapter;
        lifecycle: ApplicationLifeCycle;
        kernel: Kernel;
    });
    private dispatchRequest;
    listen(options?: HttpServerOptions): Promise<void>;
    close(): Promise<void>;
    getKernel(): Kernel;
    getLifecycle(): ApplicationLifeCycle;
}
export declare function createHttpAdapter(adapter?: HttpAdapter | HttpAdapterType, adapterInstance?: any): HttpAdapter;
export declare function registerContainerInLifecycle(kernel: Kernel, lifecycle: ApplicationLifeCycle): Promise<void>;
