"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const assert_1 = __importDefault(require("assert"));
const runtime_1 = require("./runtime");
const server_1 = require("./server");
const postJson = async (url, body, token) => {
    return fetch(url, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
};
async function testBearerMode() {
    const runtime = await (0, runtime_1.createAuthSampleRuntime)();
    const server = await (0, server_1.createAuthenticatedMcpHttpServer)({
        mcp: runtime.mcp,
        mode: "bearer",
        host: "127.0.0.1",
        port: 0,
        bearerToken: "sample-bearer-token",
    });
    try {
        const missing = await postJson(`${server.url}${server.path}`, {});
        assert_1.default.strictEqual(missing.status, 401);
        const badToken = await postJson(`${server.url}${server.path}`, {}, "wrong-token");
        assert_1.default.strictEqual(badToken.status, 401);
        const authorized = await postJson(`${server.url}${server.path}`, {}, "sample-bearer-token");
        assert_1.default.strictEqual(authorized.status, 400);
    }
    finally {
        await server.close();
        await runtime.app.close();
    }
}
async function testOAuthMode() {
    const runtime = await (0, runtime_1.createAuthSampleRuntime)();
    const server = await (0, server_1.createAuthenticatedMcpHttpServer)({
        mcp: runtime.mcp,
        mode: "oauth",
        host: "127.0.0.1",
        port: 0,
        oauthClientId: "oauth-client",
        oauthClientSecret: "oauth-secret",
    });
    try {
        const metadata = await fetch(`${server.url}/.well-known/oauth-authorization-server`);
        assert_1.default.strictEqual(metadata.status, 200);
        const tokenResponse = await fetch(`${server.url}/oauth/token`, {
            method: "POST",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "client_credentials",
                client_id: "oauth-client",
                client_secret: "oauth-secret",
            }),
        });
        assert_1.default.strictEqual(tokenResponse.status, 200);
        const tokenBody = (await tokenResponse.json());
        assert_1.default.ok(typeof tokenBody.access_token === "string");
        const unauthorized = await postJson(`${server.url}${server.path}`, {});
        assert_1.default.strictEqual(unauthorized.status, 401);
        const authorized = await postJson(`${server.url}${server.path}`, {}, tokenBody.access_token);
        assert_1.default.strictEqual(authorized.status, 400);
    }
    finally {
        await server.close();
        await runtime.app.close();
    }
}
async function main() {
    await testBearerMode();
    await testOAuthMode();
    console.log("All tests passed!");
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
