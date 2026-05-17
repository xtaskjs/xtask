# @xtaskjs/testing

In-memory testing runtime for xtaskjs.

This package provides a small runtime inspired by Nest testing utilities:

- Creates an isolated dependency injection container per test module.
- Rebuilds an in-memory module graph using imports and providers.
- Supports deterministic provider overrides and mocking.
- Resolves dependencies with constructor metadata, qualifiers, and autowired fields.

## Installation

```bash
npm install @xtaskjs/testing reflect-metadata
```

## Quick Start

```typescript
import "reflect-metadata";
import { Service } from "@xtaskjs/core";
import { Module, Test } from "@xtaskjs/testing";

@Service()
class HttpClient {
  get() {
    return "live";
  }
}

@Service()
class UserService {
  constructor(private readonly httpClient: HttpClient) {}

  listUsers() {
    return this.httpClient.get();
  }
}

@Module({
  providers: [HttpClient, UserService],
})
class UsersModule {}

const moduleRef = await Test.createTestingModule(UsersModule)
  .overrideProvider(HttpClient)
  .useValue({ get: () => "mocked" })
  .compile();

const service = moduleRef.get(UserService);
service.listUsers(); // "mocked"

await moduleRef.close();
```

## API

- `Module(metadata)`: declares testing modules with `imports`, `providers`, and `exports`.
- `Test.createTestingModule(input)`: starts a builder from module class or metadata object.
- `overrideProvider(token)`: override provider with:
  - `useValue(value)`
  - `useClass(type)`
  - `useFactory(factory, inject?)`
- `compile()`: builds and returns an isolated testing module.
- `moduleRef.get(token)`: resolves a provider token.
- `moduleRef.resolve(token)`: async-friendly alias of `get`.
- `moduleRef.close()`: executes pre-destroy hooks and clears container state.

## Resources

- Project site and documentation: [xtaskjs.io](https://xtaskjs.io)
- npm package: [@xtaskjs/testing](https://www.npmjs.com/package/@xtaskjs/testing)
- Source repository: [xtaskjs/xtaskjs](https://github.com/xtaskjs/xtaskjs)
