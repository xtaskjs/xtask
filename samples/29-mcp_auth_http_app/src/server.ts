import { randomUUID } from "node:crypto";
import express, { type Request, type Response, type NextFunction } from "express";
import { bindMcpSdkStreamableHttp } from "@xtaskjs/mcp";
import type { McpService } from "@xtaskjs/mcp";
import type { AuthMode } from "./runtime";

interface CreateAuthServerOptions {
  mcp: McpService;
  mode: AuthMode;
  host?: string;
  port?: number;
  bearerToken?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthIssuerBaseUrl?: string;
}

interface OAuthTokenRecord {
  token: string;
  expiresAt: number;
  clientId: string;
}

const parseBearerToken = (authorization?: string): string | undefined => {
  if (!authorization) {
    return undefined;
  }

  const [scheme, token] = authorization.split(" ");
  if (!scheme || !token) {
    return undefined;
  }

  return scheme.toLowerCase() === "bearer" ? token : undefined;
};

export const createAuthenticatedMcpHttpServer = async (options: CreateAuthServerOptions) => {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  const host = options.host || "127.0.0.1";
  const configuredPort = options.port || 9200;
  const path = "/mcp";

  const issuedTokens = new Map<string, OAuthTokenRecord>();
  const staticBearerToken = options.bearerToken || "xtask-dev-token";
  const oauthClientId = options.oauthClientId || "xtask-client";
  const oauthClientSecret = options.oauthClientSecret || "xtask-secret";

  const cleanupExpiredTokens = () => {
    const now = Date.now();
    for (const [token, record] of issuedTokens.entries()) {
      if (record.expiresAt <= now) {
        issuedTokens.delete(token);
      }
    }
  };

  const oauthIssuerBaseUrl =
    options.oauthIssuerBaseUrl || `http://${host}:${configuredPort}`;

  app.get("/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      mode: options.mode,
    });
  });

  if (options.mode === "oauth") {
    app.get("/.well-known/oauth-authorization-server", (_req, res) => {
      res.status(200).json({
        issuer: oauthIssuerBaseUrl,
        token_endpoint: `${oauthIssuerBaseUrl}/oauth/token`,
        token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
        grant_types_supported: ["client_credentials"],
      });
    });

    app.get("/.well-known/oauth-protected-resource/mcp", (_req, res) => {
      res.status(200).json({
        resource: `${oauthIssuerBaseUrl}${path}`,
        authorization_servers: [oauthIssuerBaseUrl],
      });
    });

    app.post("/oauth/token", (req, res) => {
      const grantType = String(req.body?.grant_type || "");
      const clientId = String(req.body?.client_id || "");
      const clientSecret = String(req.body?.client_secret || "");

      if (grantType !== "client_credentials") {
        res.status(400).json({
          error: "unsupported_grant_type",
          error_description: "Only client_credentials is supported in this sample",
        });
        return;
      }

      if (clientId !== oauthClientId || clientSecret !== oauthClientSecret) {
        res.status(401).json({
          error: "invalid_client",
          error_description: "Invalid OAuth client credentials",
        });
        return;
      }

      const token = `xtask-oauth-${randomUUID()}`;
      const expiresIn = 3600;
      issuedTokens.set(token, {
        token,
        expiresAt: Date.now() + expiresIn * 1000,
        clientId,
      });

      res.status(200).json({
        token_type: "Bearer",
        access_token: token,
        expires_in: expiresIn,
      });
    });
  }

  const authGuard = (req: Request, res: Response, next: NextFunction): void => {
    const bearer = parseBearerToken(req.headers.authorization);
    if (!bearer) {
      res.setHeader("WWW-Authenticate", "Bearer");
      res.status(401).json({
        error: "missing_bearer_token",
      });
      return;
    }

    if (options.mode === "bearer") {
      if (bearer !== staticBearerToken) {
        res.setHeader("WWW-Authenticate", "Bearer error=\"invalid_token\"");
        res.status(401).json({
          error: "invalid_token",
        });
        return;
      }

      next();
      return;
    }

    cleanupExpiredTokens();
    if (!issuedTokens.has(bearer)) {
      res.setHeader("WWW-Authenticate", "Bearer error=\"invalid_token\"");
      res.status(401).json({
        error: "invalid_token",
      });
      return;
    }

    next();
  };

  app.use(path, authGuard);

  const mcpHandle = await bindMcpSdkStreamableHttp({
    mcp: options.mcp,
    serverName: "xtask-auth-sample",
    app,
    path,
    sessionIdGenerator: () => randomUUID(),
  });

  const httpServer = app.listen(configuredPort, host);

  const actualPort = await new Promise<number>((resolve, reject) => {
    httpServer.once("listening", () => {
      const address = httpServer.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to resolve server listen address"));
        return;
      }

      resolve(address.port);
    });

    httpServer.once("error", (error) => {
      reject(error);
    });
  });

  return {
    host,
    port: actualPort,
    mode: options.mode,
    url: `http://${host}:${actualPort}`,
    path,
    async close(): Promise<void> {
      await mcpHandle.close();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
};
