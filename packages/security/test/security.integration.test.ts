import "reflect-metadata";
import { createCipheriv, randomBytes } from "crypto";
import { describe, beforeEach, afterEach, expect, test } from "@jest/globals";
import { Controller, Get } from "@xtaskjs/common";
import { ApplicationLifeCycle, Container, registerControllerRoutes } from "@xtaskjs/core";
import {
  AllowAnonymous,
  Authenticated,
  Auth,
  InjectAuthenticationService,
  Roles,
  SecurityAuthenticationService,
  clearRegisteredSecurityStrategies,
  getAuthenticationServiceToken,
  initializeSecurityIntegration,
  registerJweStrategy,
  registerJwtStrategy,
  shutdownSecurityIntegration,
} from "../src";

const jwtSecret = new TextEncoder().encode("jwt-secret-for-tests-1234567890");
const jweSecret = new TextEncoder().encode("0123456789abcdef0123456789abcdef");

const encodeBase64Url = (value: Buffer | string): string => {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const createDirA256GcmJwe = (payload: Record<string, any>, key: Uint8Array): string => {
  const protectedHeader = { alg: "dir", enc: "A256GCM" };
  const protectedHeaderSegment = encodeBase64Url(JSON.stringify(protectedHeader));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key), iv);
  cipher.setAAD(Buffer.from(protectedHeaderSegment, "utf-8"));
  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(payload), "utf-8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    protectedHeaderSegment,
    "",
    encodeBase64Url(iv),
    encodeBase64Url(ciphertext),
    encodeBase64Url(tag),
  ].join(".");
};

describe("@xtaskjs/security integration", () => {
  beforeEach(async () => {
    clearRegisteredSecurityStrategies();
    await shutdownSecurityIntegration();
  });

  afterEach(async () => {
    clearRegisteredSecurityStrategies();
    await shutdownSecurityIntegration();
  });

  test("authenticates JWT requests and registers services in the container", async () => {
    const jsonwebtoken = require("jsonwebtoken");

    class UserDirectory {
      private readonly users = new Map<string, { id: string; roles: string[]; active: boolean }>([
        ["alice", { id: "alice", roles: ["admin"], active: true }],
        ["blocked", { id: "blocked", roles: ["admin"], active: false }],
      ]);

      findActiveUser(id: string) {
        const user = this.users.get(id);
        if (!user || !user.active) {
          return undefined;
        }
        return user;
      }
    }

    registerJwtStrategy({
      name: "default",
      default: true,
      secretOrKey: jwtSecret,
      validate: async (payload, context) => {
        if (payload.tenant !== "xtaskjs") {
          return false;
        }

        const directory = context.container?.get(UserDirectory);
        const user = directory?.findActiveUser(String(payload.sub || ""));
        if (!user) {
          return false;
        }

        return {
          id: user.id,
          sub: user.id,
          roles: user.roles,
          claims: payload,
        };
      },
    });

    const container = new Container();
    container.register(UserDirectory, { scope: "singleton" });
    await initializeSecurityIntegration(container);

    class SecurityConsumer {
      constructor(
        @InjectAuthenticationService()
        public readonly authentication: SecurityAuthenticationService
      ) {}
    }

    container.register(SecurityConsumer, { scope: "singleton" });

    const injected = container.get(SecurityConsumer);
    const byName = container.getByName<SecurityAuthenticationService>(getAuthenticationServiceToken());

    expect(injected.authentication).toBeInstanceOf(SecurityAuthenticationService);
    expect(byName).toBeInstanceOf(SecurityAuthenticationService);

    @Controller("secure")
    class SecureController {
      @Get("/profile")
      @Authenticated()
      @Roles("admin")
      profile(req: any) {
        return {
          sub: req.user.sub,
          roles: req.auth.roles,
        };
      }

      @Get("/health")
      @AllowAnonymous()
      health() {
        return { ok: true };
      }
    }

    const token = jsonwebtoken.sign(
      { sub: "alice", tenant: "xtaskjs", roles: ["admin"] },
      Buffer.from(jwtSecret),
      { algorithm: "HS256", expiresIn: "2h" }
    );

    const lifecycle = new ApplicationLifeCycle();
    registerControllerRoutes(new SecureController(), lifecycle);

    const request: any = { headers: { authorization: `Bearer ${token}` } };
    const response: any = {};

    const result = await lifecycle.dispatchControllerRoute(
      "GET",
      "/secure/profile",
      request,
      response
    );

    expect(result).toEqual({ sub: "alice", roles: ["admin"] });
    expect(request.auth.isAuthenticated).toBe(true);
    expect(request.auth.strategy).toBe("default");
    expect(request.user.claims.tenant).toBe("xtaskjs");

    const publicResult = await lifecycle.dispatchControllerRoute("GET", "/secure/health", {}, {});
    expect(publicResult).toEqual({ ok: true });
  });

  test("uses validate callbacks for DI-backed user lookup and claim validation", async () => {
    const jsonwebtoken = require("jsonwebtoken");

    class AccountService {
      private readonly accounts = new Map<string, { id: string; roles: string[]; active: boolean }>([
        ["sarah", { id: "sarah", roles: ["editor"], active: true }],
      ]);

      findById(id: string) {
        return this.accounts.get(id);
      }
    }

    registerJwtStrategy({
      name: "lookup",
      default: true,
      secretOrKey: jwtSecret,
      validate: async (payload, context) => {
        if (payload.tenant !== "docs") {
          return false;
        }

        const service = context.container?.get(AccountService);
        const account = service?.findById(String(payload.sub || ""));
        if (!account || !account.active) {
          return false;
        }

        return {
          sub: account.id,
          roles: account.roles,
          claims: payload,
        };
      },
    });

    const container = new Container();
    container.register(AccountService, { scope: "singleton" });
    await initializeSecurityIntegration(container);

    @Controller("docs")
    class DocsController {
      @Get("/me")
      @Authenticated("lookup")
      @Roles("editor")
      me(req: any) {
        return {
          user: req.user.sub,
          tenant: req.user.claims.tenant,
        };
      }
    }

    const validToken = jsonwebtoken.sign(
      { sub: "sarah", tenant: "docs" },
      Buffer.from(jwtSecret),
      { algorithm: "HS256", expiresIn: "2h" }
    );
    const invalidTenantToken = jsonwebtoken.sign(
      { sub: "sarah", tenant: "other" },
      Buffer.from(jwtSecret),
      { algorithm: "HS256", expiresIn: "2h" }
    );

    const lifecycle = new ApplicationLifeCycle();
    registerControllerRoutes(new DocsController(), lifecycle);

    await expect(
      lifecycle.dispatchControllerRoute(
        "GET",
        "/docs/me",
        { headers: { authorization: `Bearer ${invalidTenantToken}` } },
        {}
      )
    ).rejects.toMatchObject({ statusCode: 401 });

    const result = await lifecycle.dispatchControllerRoute(
      "GET",
      "/docs/me",
      { headers: { authorization: `Bearer ${validToken}` } },
      {}
    );

    expect(result).toEqual({ user: "sarah", tenant: "docs" });
  });

  test("authenticates JWE requests and rejects missing roles", async () => {
    registerJweStrategy({
      name: "encrypted",
      default: true,
      decryptionKey: jweSecret,
    });

    await initializeSecurityIntegration();

    @Controller("reports")
    class ReportsController {
      @Get("/admin")
      @Auth("encrypted")
      @Roles({ roles: ["admin"], mode: "all" })
      admin(req: any) {
        return { user: req.user.sub };
      }
    }

    const token = createDirA256GcmJwe(
      {
        sub: "bob",
        roles: ["viewer"],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      jweSecret
    );

    const lifecycle = new ApplicationLifeCycle();
    registerControllerRoutes(new ReportsController(), lifecycle);

    await expect(
      lifecycle.dispatchControllerRoute(
        "GET",
        "/reports/admin",
        { headers: { authorization: `Bearer ${token}` } },
        {}
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test("rejects requests without credentials", async () => {
    registerJwtStrategy({
      name: "default",
      default: true,
      secretOrKey: jwtSecret,
    });

    await initializeSecurityIntegration();

    @Controller("users")
    class UsersController {
      @Get("/me")
      @Authenticated()
      me() {
        return { ok: true };
      }
    }

    const lifecycle = new ApplicationLifeCycle();
    registerControllerRoutes(new UsersController(), lifecycle);

    await expect(lifecycle.dispatchControllerRoute("GET", "/users/me", {}, {})).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});