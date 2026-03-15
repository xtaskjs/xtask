import { HttpMethod } from "@xtaskjs/common";

export type HttpAdapterType = "express";

export interface HttpServerOptions {
  port?: number;
  host?: string;
}

export interface HttpRequestLike {
  method?: string;
  url?: string;
  path?: string;
  body?: any;
  params?: Record<string, any>;
  query?: Record<string, any>;
  headers?: Record<string, any>;
  rawBody?: string;
}

export interface HttpViewResult {
  readonly __xtaskView: true;
  template: string;
  model?: Record<string, any>;
  statusCode?: number;
}

export interface HttpResponseLike {
  statusCode?: number;
  headersSent?: boolean;
  setHeader?: (name: string, value: string) => void;
  end?: (chunk?: any) => void;
  json?: (payload: any) => void;
  send?: (payload: any) => void;
  status?: (code: number) => HttpResponseLike;
  render?: (view: string, locals?: Record<string, any>, callback?: (error: Error | null, html?: string) => void) => void;
}

export type HttpRequestHandler = (
  method: HttpMethod,
  path: string,
  req: HttpRequestLike,
  res: HttpResponseLike
) => Promise<void>;

export interface HttpAdapter {
  readonly type: HttpAdapterType;
  registerRequestHandler(handler: HttpRequestHandler): void;
  renderView?(req: HttpRequestLike, res: HttpResponseLike, payload: HttpViewResult): Promise<void>;
  listen(options: Required<HttpServerOptions>): Promise<void>;
  close(): Promise<void>;
}

export const view = (
  template: string,
  model?: Record<string, any>,
  statusCode?: number
): HttpViewResult => ({
  __xtaskView: true,
  template,
  model,
  statusCode,
});

export interface ExpressTemplateEngineOptions {
  viewsPath?: string;
  fileExtension?: string;
  viewEngine?: string;
  extension?: string;
  engine?: (...args: any[]) => any;
  render?: (
    template: string,
    model: Record<string, any>,
    context: { req: HttpRequestLike; res: HttpResponseLike }
  ) => string | Promise<string>;
}

export interface ExpressStaticFilesOptions {
  enabled?: boolean;
  publicPath?: string;
  urlPrefix?: string;
}

export interface ExpressAdapterOptions {
  templateEngine?: ExpressTemplateEngineOptions;
  staticFiles?: ExpressStaticFilesOptions;
}
