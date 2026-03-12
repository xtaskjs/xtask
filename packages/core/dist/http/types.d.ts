import { HttpMethod } from "@xtaskjs/common";
export type HttpAdapterType = "node-http" | "express" | "fastify";
export interface HttpServerOptions {
    port?: number;
    host?: string;
}
export interface HttpRequestLike {
    method?: string;
    url?: string;
    path?: string;
    body?: any;
}
export interface HttpViewResult {
    readonly __xtaskView: true;
    template: string;
    model?: Record<string, any>;
    statusCode?: number;
}
export declare const view: (template: string, model?: Record<string, any>, statusCode?: number) => HttpViewResult;
export interface HttpResponseLike {
    statusCode?: number;
    headersSent?: boolean;
    setHeader?: (name: string, value: string) => void;
    end?: (chunk?: any) => void;
    json?: (payload: any) => void;
    send?: (payload: any) => void;
    status?: (code: number) => HttpResponseLike;
}
export type HttpRequestHandler = (method: HttpMethod, path: string, req: HttpRequestLike, res: HttpResponseLike) => Promise<void>;
export interface HttpAdapter {
    readonly type: HttpAdapterType;
    registerRequestHandler(handler: HttpRequestHandler): void;
    renderView?(req: HttpRequestLike, res: HttpResponseLike, payload: HttpViewResult): Promise<void>;
    listen(options: Required<HttpServerOptions>): Promise<void>;
    close(): Promise<void>;
}
