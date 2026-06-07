# 29-mcp_auth_http_app

Sample MCP HTTP server with authentication over `/mcp` using `@xtaskjs/mcp` + official `@modelcontextprotocol/sdk` adapter.

Supported auth modes:

- `bearer`: static bearer token guard.
- `oauth`: OAuth2 `client_credentials` flow that mints bearer tokens for MCP access.

## Install

```bash
npm install
```

From this folder: `samples/29-mcp_auth_http_app`.

## Run (Bearer mode)

```bash
MCP_AUTH_MODE=bearer MCP_BEARER_TOKEN=xtask-dev-token npm start
```

Then call MCP endpoint with:

```bash
Authorization: Bearer xtask-dev-token
```

## Run (OAuth mode)

```bash
MCP_AUTH_MODE=oauth MCP_OAUTH_CLIENT_ID=xtask-client MCP_OAUTH_CLIENT_SECRET=xtask-secret npm start
```

OAuth helper endpoints exposed by the sample:

- `GET /.well-known/oauth-authorization-server`
- `GET /.well-known/oauth-protected-resource/mcp`
- `POST /oauth/token` (grant_type=`client_credentials`)

Use the returned `access_token` as Bearer token against `/mcp`.

## Verify

```bash
npm test
```

## What to follow in code

- `src/mcp.server.ts`: decorator-based MCP server definition.
- `src/runtime.ts`: xtask runtime + mcp service bootstrap.
- `src/server.ts`: HTTP server wiring, auth guards, OAuth endpoints, MCP route binding.
- `src/app.ts`: sample entrypoint and graceful shutdown.
- `src/app.spec.ts`: smoke tests for both auth modes.
