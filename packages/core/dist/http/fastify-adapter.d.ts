import { HttpAdapter, HttpRequestHandler, HttpRequestLike, HttpResponseLike, HttpServerOptions, HttpViewResult } from "./types";
export declare class FastifyAdapter implements HttpAdapter {
    readonly type: "fastify";
    private readonly delegate;
    constructor(app: any, options?: any);
    registerRequestHandler(handler: HttpRequestHandler): void;
    renderView: (req: HttpRequestLike, res: HttpResponseLike, payload: HttpViewResult) => Promise<void>;
    listen(options: Required<HttpServerOptions>): Promise<void>;
    close(): Promise<void>;
}
