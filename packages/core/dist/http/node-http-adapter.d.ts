import { HttpAdapter, HttpRequestHandler, HttpServerOptions } from "./types";
export declare class NodeHttpAdapter implements HttpAdapter {
    readonly type: "node-http";
    private server?;
    private handler?;
    registerRequestHandler(handler: HttpRequestHandler): void;
    listen(options: Required<HttpServerOptions>): Promise<void>;
    close(): Promise<void>;
}
