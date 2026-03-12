"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FastifyAdapter = void 0;
class FastifyAdapter {
    constructor(app, options) {
        this.type = "fastify";
        this.renderView = async (req, res, payload) => {
            if (typeof this.delegate.renderView === "function") {
                await this.delegate.renderView(req, res, payload);
            }
        };
        const fastifyHttpPackage = require("@xtaskjs/fastify-http");
        this.delegate = new fastifyHttpPackage.FastifyAdapter(app, options);
    }
    registerRequestHandler(handler) {
        this.delegate.registerRequestHandler(handler);
    }
    async listen(options) {
        await this.delegate.listen(options);
    }
    async close() {
        await this.delegate.close();
    }
}
exports.FastifyAdapter = FastifyAdapter;
