# @xtaskjs/security

Security integration package for xtaskjs.

## Installation
```bash
npm install @xtaskjs/security passport passport-jwt reflect-metadata
```

## What It Provides
- Passport-backed JWT and JWE authentication.
- Authorization decorators for controller routes.
- DI tokens for auth services, Passport, and the lifecycle manager.
- Lifecycle initialization integrated with `CreateApplication()` and `app.close()`.

## Register Strategies
```typescript
import { registerJwtStrategy, registerJweStrategy } from "@xtaskjs/security";

registerJwtStrategy({
  name: "default",
  default: true,
  secretOrKey: process.env.JWT_SECRET,
});

registerJweStrategy({
  name: "encrypted",
  decryptionKey: process.env.JWE_SECRET,
});
```

## Validate Callbacks
Use `validate` to enforce application-specific claims and load the current user from your DI container.

```typescript
import { registerJwtStrategy } from "@xtaskjs/security";
import { CreateApplication } from "@xtaskjs/core";

class UserDirectory {
  async findActiveUser(id: string) {
    return id === "alice" ? { id: "alice", roles: ["admin"] } : undefined;
  }
}

registerJwtStrategy({
  name: "default",
  default: true,
  secretOrKey: process.env.JWT_SECRET,
  validate: async (payload, context) => {
    if (payload.tenant !== "xtaskjs") {
      return false;
    }

    const userDirectory = context.container?.get(UserDirectory);
    const user = await userDirectory?.findActiveUser(String(payload.sub || ""));
    if (!user) {
      return false;
    }

    return {
      sub: user.id,
      roles: user.roles,
      claims: payload,
    };
  },
});

await CreateApplication();
```

## Secure Controllers
```typescript
import { Controller, Get } from "@xtaskjs/common";
import { Authenticated, Roles, AllowAnonymous } from "@xtaskjs/security";

@Controller("admin")
@Authenticated()
class AdminController {
  @Get("/profile")
  @Roles("admin")
  profile(req: any) {
    return {
      user: req.user,
      auth: req.auth,
    };
  }

  @Get("/health")
  @AllowAnonymous()
  health() {
    return { ok: true };
  }
}
```

## DI Integration
```typescript
import { Service } from "@xtaskjs/core";
import {
  InjectAuthenticationService,
  InjectAuthorizationService,
  SecurityAuthenticationService,
  SecurityAuthorizationService,
} from "@xtaskjs/security";

@Service()
class SecurityAwareService {
  constructor(
    @InjectAuthenticationService()
    private readonly authentication: SecurityAuthenticationService,
    @InjectAuthorizationService()
    private readonly authorization: SecurityAuthorizationService
  ) {}
}
```