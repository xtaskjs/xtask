import {
	HttpAdapter,
	HttpRequestHandler,
	HttpRequestLike,
	HttpResponseLike,
	HttpServerOptions,
	HttpViewResult,
} from "./types";

export class FastifyAdapter implements HttpAdapter {
	public readonly type = "fastify" as const;
	private readonly delegate: HttpAdapter;

	constructor(app: any, options?: any) {
		const fastifyHttpPackage = require("@xtaskjs/fastify-http") as {
			FastifyAdapter: new (app: any, options?: any) => HttpAdapter;
		};
		this.delegate = new fastifyHttpPackage.FastifyAdapter(app, options);
	}

	registerRequestHandler(handler: HttpRequestHandler): void {
		this.delegate.registerRequestHandler(handler);
	}

	renderView = async (
		req: HttpRequestLike,
		res: HttpResponseLike,
		payload: HttpViewResult
	): Promise<void> => {
		if (typeof this.delegate.renderView === "function") {
			await this.delegate.renderView(req, res, payload);
		}
	};

	async listen(options: Required<HttpServerOptions>): Promise<void> {
		await this.delegate.listen(options);
	}

	async close(): Promise<void> {
		await this.delegate.close();
	}
}
