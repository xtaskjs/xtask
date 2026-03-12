import { ExpressAdapterOptions, HttpAdapter, HttpRequestHandler, HttpRequestLike, HttpResponseLike, HttpServerOptions, HttpViewResult } from "./types";
export declare class ExpressAdapter implements HttpAdapter {
    readonly type: "express";
    private readonly app;
    private readonly viewsPath;
    private readonly fileExtension;
    private readonly templateRenderer?;
    private readonly hasNativeViewEngine;
    private closeServer?;
    constructor(app: any, options?: ExpressAdapterOptions);
    private renderFileTemplate;
    registerRequestHandler(handler: HttpRequestHandler): void;
    listen(options: Required<HttpServerOptions>): Promise<void>;
    renderView(req: HttpRequestLike, res: HttpResponseLike, payload: HttpViewResult): Promise<void>;
    close(): Promise<void>;
}
