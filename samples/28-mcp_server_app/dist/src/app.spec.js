"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const assert_1 = __importDefault(require("assert"));
const runtime_1 = require("./runtime");
async function main() {
    const runtime = await (0, runtime_1.createSampleRuntime)();
    try {
        const servers = runtime.mcp.listServers();
        assert_1.default.strictEqual(servers.length, 1);
        assert_1.default.strictEqual(servers[0].name, "xtask-sample");
        const methods = runtime.mcp.listMethods("xtask-sample");
        assert_1.default.ok(methods.some((method) => method.kind === "tool" && method.name === "echo"));
        assert_1.default.ok(methods.some((method) => method.kind === "tool" && method.name === "sum"));
        assert_1.default.ok(methods.some((method) => method.kind === "prompt" && method.name === "status"));
        assert_1.default.ok(methods.some((method) => method.kind === "resource" && method.uriTemplate === "resource://xtask/status"));
        const echo = await runtime.mcp.executeTool("xtask-sample", "echo", { hello: "world" });
        assert_1.default.ok(typeof echo === "object");
        const sum = (await runtime.mcp.executeTool("xtask-sample", "sum", {
            values: [2, 3, 5],
        }));
        assert_1.default.strictEqual(sum.total, 10);
        assert_1.default.strictEqual(sum.count, 3);
        const prompt = await runtime.mcp.renderPrompt("xtask-sample", "status", {
            audience: "maintainer",
        });
        assert_1.default.strictEqual(typeof prompt, "string");
        const resource = (await runtime.mcp.readResource("xtask-sample", "resource://xtask/status"));
        assert_1.default.strictEqual(resource.healthy, true);
        console.log("All tests passed!");
    }
    finally {
        await runtime.app.close();
    }
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
