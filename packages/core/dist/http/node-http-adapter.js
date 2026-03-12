"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeHttpAdapter = void 0;
const http_1 = require("http");
const SUPPORTED_METHODS = ["GET", "POST", "PATCH", "DELETE"];
class NodeHttpAdapter {
    constructor() {
        this.type = "node-http";
    }
    registerRequestHandler(handler) {
        this.handler = handler;
    }
    async listen(options) {
        if (!this.handler) {
            throw new Error("No request handler registered for node-http adapter");
        }
        if (!this.server) {
            this.server = (0, http_1.createServer)(async (req, res) => {
                try {
                    const method = (req.method || "GET").toUpperCase();
                    if (!SUPPORTED_METHODS.includes(method)) {
                        res.statusCode = 405;
                        res.end("Method Not Allowed");
                        return;
                    }
                    const host = req.headers.host || "localhost";
                    const url = new URL(req.url || "/", `http://${host}`);
                    const path = url.pathname || "/";
                    await this.handler(method, path, req, res);
                }
                catch (error) {
                    res.statusCode = 500;
                    res.setHeader("content-type", "application/json");
                    res.end(JSON.stringify({ message: "Internal Server Error", error: error?.message }));
                }
            });
        }
        await new Promise((resolve, reject) => {
            this.server.once("error", reject);
            this.server.listen(options.port, options.host, () => resolve());
        });
    }
    async close() {
        if (!this.server) {
            return;
        }
        await new Promise((resolve, reject) => {
            this.server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
        this.server = undefined;
    }
}
exports.NodeHttpAdapter = NodeHttpAdapter;
