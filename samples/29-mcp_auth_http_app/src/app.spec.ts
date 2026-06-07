import "reflect-metadata";
import assert from "assert";
import { createAuthSampleRuntime } from "./runtime";
import { createAuthenticatedMcpHttpServer } from "./server";

const postJson = async (
  url: string,
  body: unknown,
  token?: string
): Promise<Response> => {
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
  const runtime = await createAuthSampleRuntime();
  const server = await createAuthenticatedMcpHttpServer({
    mcp: runtime.mcp,
    mode: "bearer",
    host: "127.0.0.1",
    port: 0,
    bearerToken: "sample-bearer-token",
  });

  try {
    const missing = await postJson(`${server.url}${server.path}`, {});
    assert.strictEqual(missing.status, 401);

    const badToken = await postJson(`${server.url}${server.path}`, {}, "wrong-token");
    assert.strictEqual(badToken.status, 401);

    const authorized = await postJson(`${server.url}${server.path}`, {}, "sample-bearer-token");
    assert.strictEqual(authorized.status, 400);
  } finally {
    await server.close();
    await runtime.app.close();
  }
}

async function testOAuthMode() {
  const runtime = await createAuthSampleRuntime();
  const server = await createAuthenticatedMcpHttpServer({
    mcp: runtime.mcp,
    mode: "oauth",
    host: "127.0.0.1",
    port: 0,
    oauthClientId: "oauth-client",
    oauthClientSecret: "oauth-secret",
  });

  try {
    const metadata = await fetch(`${server.url}/.well-known/oauth-authorization-server`);
    assert.strictEqual(metadata.status, 200);

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

    assert.strictEqual(tokenResponse.status, 200);
    const tokenBody = (await tokenResponse.json()) as { access_token: string };
    assert.ok(typeof tokenBody.access_token === "string");

    const unauthorized = await postJson(`${server.url}${server.path}`, {});
    assert.strictEqual(unauthorized.status, 401);

    const authorized = await postJson(`${server.url}${server.path}`, {}, tokenBody.access_token);
    assert.strictEqual(authorized.status, 400);
  } finally {
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
