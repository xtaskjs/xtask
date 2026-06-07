const MCP_LIFECYCLE_TOKEN = "xtask:mcp:lifecycle";
const MCP_SERVICE_TOKEN = "xtask:mcp:service";

export const getMcpLifecycleToken = (): string => {
  return MCP_LIFECYCLE_TOKEN;
};

export const getMcpServiceToken = (): string => {
  return MCP_SERVICE_TOKEN;
};
