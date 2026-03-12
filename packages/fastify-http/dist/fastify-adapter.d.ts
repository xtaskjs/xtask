import { FastifyAdapterOptions, HttpAdapter, HttpRequestHandler, HttpRequestLike, HttpResponseLike, HttpServerOptions, HttpViewResult } from "./types";
export declare class FastifyAdapter implements HttpAdapter {
    readonly type: "fastify";
    private readonly app;
    private readonly templateRenderer?;
    private readonly nativeTemplateRenderer?;
    private readonly staticEnabled;
    private readonly publicPath;
    private readonly publicPrefix;
    private readonly resolvedPublicPath;
    private readonly viewsPath;
    private readonly fileExtension;
    private readonly resolvedViewsPath;
    constructor(app: any, options?: FastifyAdapterOptions);
    private renderFileTemplate;
    private tryServeStatic;
    private createResponseProxy;
    registerRequestHandler(handler: HttpRequestHandler): void;
    listen(options: Required<HttpServerOptions>): Promise<void>;
    renderView(req: HttpRequestLike, res: HttpResponseLike, payload: HttpViewResult): Promise<void>;
    close(): Promise<void>;
}
