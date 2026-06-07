# Changelog

## 1.0.0

- Initial release of `@xtaskjs/mcp`.
- Added decorator-based MCP server builder (`@McpServer`, `@McpTool`, `@McpPrompt`, `@McpResource`).
- Added lifecycle hooks (`@OnMcpServerStart`, `@OnMcpServerStop`) and DI injection decorators.
- Added integration with xtaskjs application lifecycle through `initializeMcpIntegration`.
- Added official adapter helpers for `@modelcontextprotocol/sdk` (`createMcpSdkServerAdapter`, `connectMcpSdkStdio`, `bindMcpSdkStreamableHttp`).
