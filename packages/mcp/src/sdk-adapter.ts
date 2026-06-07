import type { McpService } from "./mcp.service";

type AnyRecord = Record<string, any>;

const sdkMissingMessage =
  "@xtaskjs/mcp sdk adapter requires @modelcontextprotocol/sdk. Install it with: npm install @modelcontextprotocol/sdk";

const requireSdkModule = <T = AnyRecord>(path: string): T => {
  try {
    return require(path) as T;
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" &&
      (String(error?.message || "").includes("@modelcontextprotocol/sdk") ||
        String(error?.message || "").includes(path));

    if (missingPackage) {
      throw new Error(sdkMissingMessage);
    }

    throw error;
  }
};

const isInitializeRequest = (body: unknown): boolean => {
  if (!body || typeof body !== "object") {
    return false;
  }

  return (body as AnyRecord).method === "initialize";
};

const toText = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value ?? null, null, 2);
};

const toToolResult = (value: unknown): AnyRecord => {
  if (value && typeof value === "object" && Array.isArray((value as AnyRecord).content)) {
    return value;
  }

  return {
    content: [
      {
        type: "text",
        text: toText(value),
      },
    ],
  };
};

const toPromptResult = (value: unknown): AnyRecord => {
  if (value && typeof value === "object" && Array.isArray((value as AnyRecord).messages)) {
    return value;
  }

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: toText(value),
        },
      },
    ],
  };
};

const toResourceResult = (uri: string, value: unknown): AnyRecord => {
  if (value && typeof value === "object" && Array.isArray((value as AnyRecord).contents)) {
    return value;
  }

  return {
    contents: [
      {
        uri,
        text: toText(value),
      },
    ],
  };
};

const registerPromptCompat = (server: any, name: string, description: string | undefined, handler: any): void => {
  try {
    server.registerPrompt(
      name,
      {
        description,
      },
      handler
    );
  } catch {
    server.registerPrompt(name, handler);
  }
};

const registerResourceCompat = (
  server: any,
  name: string,
  uri: string,
  description: string | undefined,
  mimeType: string | undefined,
  handler: any
): void => {
  try {
    server.registerResource(
      name,
      uri,
      {
        description,
        mimeType,
      },
      handler
    );
  } catch {
    server.registerResource(name, uri, handler);
  }
};

export interface McpSdkServerAdapter {
  readonly serverName: string;
  readonly sdkServer: any;
  close(): Promise<void>;
}

export interface CreateMcpSdkServerAdapterOptions {
  mcp: McpService;
  serverName: string;
  instructions?: string;
}

export interface McpSdkStdioHandle extends McpSdkServerAdapter {
  readonly transport: any;
}

export interface McpSdkStreamableHttpHandle {
  readonly path: string;
  readonly sessions: ReadonlyMap<string, { server: any; transport: any }>;
  close(): Promise<void>;
}

export interface StartMcpSdkStreamableHttpOptions {
  mcp: McpService;
  serverName: string;
  app: {
    post: (path: string, handler: (req: any, res: any) => any) => void;
    get: (path: string, handler: (req: any, res: any) => any) => void;
    delete: (path: string, handler: (req: any, res: any) => any) => void;
  };
  path?: string;
  sessionIdGenerator?: () => string;
  instructions?: string;
}

export const createMcpSdkServerAdapter = (
  options: CreateMcpSdkServerAdapterOptions
): McpSdkServerAdapter => {
  const { McpServer } = requireSdkModule<{ McpServer: new (...args: any[]) => any }>(
    "@modelcontextprotocol/sdk/server/mcp.js"
  );

  const serverSummary = options.mcp.listServers().find((entry) => entry.name === options.serverName);
  if (!serverSummary) {
    throw new Error(`MCP server '${options.serverName}' is not registered in @xtaskjs/mcp`);
  }

  const sdkServer = new McpServer(
    {
      name: serverSummary.name,
      version: serverSummary.version || "1.0.0",
    },
    {
      instructions:
        options.instructions ||
        serverSummary.instructions ||
        "MCP server bridged from @xtaskjs/mcp decorators.",
    }
  );

  const methods = options.mcp.listMethods(options.serverName);
  for (const method of methods) {
    if (method.disabled) {
      continue;
    }

    if (method.kind === "tool") {
      sdkServer.registerTool(
        method.name,
        {
          description: method.description,
        },
        async (args: unknown) => {
          const output = await options.mcp.executeTool(options.serverName, method.name, args);
          return toToolResult(output);
        }
      );
      continue;
    }

    if (method.kind === "prompt") {
      registerPromptCompat(sdkServer, method.name, method.description, async (args: unknown) => {
        const output = await options.mcp.renderPrompt(options.serverName, method.name, args);
        return toPromptResult(output);
      });
      continue;
    }

    const uri = method.uriTemplate || method.name;
    registerResourceCompat(
      sdkServer,
      method.name,
      uri,
      method.description,
      method.mimeType,
      async () => {
        const output = await options.mcp.readResource(options.serverName, uri);
        return toResourceResult(uri, output);
      }
    );
  }

  return {
    serverName: options.serverName,
    sdkServer,
    async close() {
      await sdkServer.close();
    },
  };
};

export const connectMcpSdkStdio = async (
  options: CreateMcpSdkServerAdapterOptions
): Promise<McpSdkStdioHandle> => {
  const { StdioServerTransport } = requireSdkModule<{ StdioServerTransport: new (...args: any[]) => any }>(
    "@modelcontextprotocol/sdk/server/stdio.js"
  );

  const adapter = createMcpSdkServerAdapter(options);
  const transport = new StdioServerTransport();
  await adapter.sdkServer.connect(transport);

  return {
    ...adapter,
    transport,
  };
};

export const bindMcpSdkStreamableHttp = async (
  options: StartMcpSdkStreamableHttpOptions
): Promise<McpSdkStreamableHttpHandle> => {
  const { StreamableHTTPServerTransport } = requireSdkModule<{
    StreamableHTTPServerTransport: new (...args: any[]) => any;
  }>("@modelcontextprotocol/sdk/server/streamableHttp.js");

  const path = options.path || "/mcp";
  const sessions = new Map<string, { server: any; transport: any }>();

  options.app.post(path, async (req: any, res: any) => {
    const sessionId = req.headers?.["mcp-session-id"] as string | undefined;

    if (sessionId) {
      const current = sessions.get(sessionId);
      if (!current) {
        res.status(404).json({
          jsonrpc: "2.0",
          error: { code: -32001, message: "Session not found" },
          id: null,
        });
        return;
      }

      await current.transport.handleRequest(req, res, req.body);
      return;
    }

    if (!isInitializeRequest(req.body)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: initialization required" },
        id: null,
      });
      return;
    }

    const adapter = createMcpSdkServerAdapter({
      mcp: options.mcp,
      serverName: options.serverName,
      instructions: options.instructions,
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: options.sessionIdGenerator,
      onsessioninitialized: (createdSessionId: string) => {
        sessions.set(createdSessionId, {
          server: adapter.sdkServer,
          transport,
        });
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        sessions.delete(transport.sessionId);
      }
    };

    await adapter.sdkServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  options.app.get(path, async (req: any, res: any) => {
    const sessionId = req.headers?.["mcp-session-id"] as string | undefined;
    if (!sessionId) {
      res.status(400).send("Missing session ID");
      return;
    }

    const current = sessions.get(sessionId);
    if (!current) {
      res.status(404).send("Session not found");
      return;
    }

    await current.transport.handleRequest(req, res);
  });

  options.app.delete(path, async (req: any, res: any) => {
    const sessionId = req.headers?.["mcp-session-id"] as string | undefined;
    if (!sessionId) {
      res.status(400).send("Missing session ID");
      return;
    }

    const current = sessions.get(sessionId);
    if (!current) {
      res.status(404).send("Session not found");
      return;
    }

    await current.transport.handleRequest(req, res);
  });

  return {
    path,
    sessions,
    async close() {
      for (const [sessionId, current] of sessions.entries()) {
        await current.transport.close();
        await current.server.close();
        sessions.delete(sessionId);
      }
    },
  };
};