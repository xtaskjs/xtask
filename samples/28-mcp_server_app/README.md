# 28-mcp_server_app

Sample application that exposes a real MCP server using `@xtaskjs/mcp` decorators and the official adapter API exported by `@xtaskjs/mcp` on top of `@modelcontextprotocol/sdk` transports:

- `stdio` (local spawned process)
- Streamable `http` (`/mcp` endpoint)

## Install

```bash
npm install
```

From this folder: `samples/28-mcp_server_app`.

## Run in stdio mode

```bash
npm run start:stdio
```

This mode is suitable for MCP hosts that spawn a local process.

## Run in HTTP mode

```bash
npm run start:http
```

By default it binds to `127.0.0.1:9000` and serves MCP at:

- `POST /mcp`
- `GET /mcp`
- `DELETE /mcp`

Override the port:

```bash
MCP_PORT=9100 npm run start:http
```

## Verify sample runtime

```bash
npm test
```

## What to follow in code

- `src/mcp.server.ts`: decorator-defined MCP server (`@McpServer`, `@McpTool`, `@McpPrompt`, `@McpResource`).
- `src/runtime.ts`: xtask runtime bootstrap and `McpService` retrieval.
- `src/app.ts`: CLI entrypoint choosing `stdio` or `http` mode.

## Notes

- This sample demonstrates how `@xtaskjs/mcp` integrates with xtask lifecycle while still exposing a real MCP transport endpoint.
- It is transport-focused; authentication/CORS hardening is intentionally minimal for local development.
