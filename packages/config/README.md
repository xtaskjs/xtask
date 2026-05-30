# @xtaskjs/config

Typed, fail-fast environment configuration for xtaskjs powered by Zod.

## Installation

```bash
pnpm add @xtaskjs/config zod
```

## Quick start

```ts
import { z } from "zod";
import { ConfigModule, InjectConfigService, type ConfigService } from "@xtaskjs/config";

const AppConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.string().transform((value) => Number(value)).refine((value) => Number.isInteger(value) && value > 0),
  DATABASE_URL: z.string().url(),
});

ConfigModule.register({
  schema: AppConfigSchema,
  envFiles: [".env", ".env.local"],
});

class AppService {
  @InjectConfigService()
  private readonly config!: ConfigService<z.infer<typeof AppConfigSchema>>;

  getPort(): number {
    return this.config.get("PORT");
  }
}
```

## Prefix support

```ts
import { ConfigModule } from "@xtaskjs/config";
import { z } from "zod";

ConfigModule.register({
  prefix: "DB",
  schema: z.object({
    HOST: z.string(),
    PORT: z.string().transform(Number),
  }),
});
```

With the example above, `HOST` and `PORT` are resolved from `DB_HOST` and `DB_PORT`.

## API

- `ConfigModule.register(options)`
- `ConfigModule.registerAsync({ useFactory })`
- `configureConfig(options)`
- `initializeConfigIntegration(container, lifecycle?)`
- `shutdownConfigIntegration()`
- `getConfigService()`
- `InjectConfigService()`
- `InjectConfigLifecycleManager()`

## Behavior

Validation runs during `initializeConfigIntegration` and fails fast before the app starts serving traffic. If validation fails, a `ConfigValidationError` is thrown with all invalid variables.
