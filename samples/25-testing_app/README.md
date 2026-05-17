# 25-testing_app

Sample app that demonstrates `@xtaskjs/testing` as an in-memory module + DI runtime.

## Run

```bash
npm install
npm test
```

From this folder: `samples/25-testing_app`.

## What It Demonstrates

- Creating a testing module with `Test.createTestingModule(...)`.
- Declaring module graph with `@Module({ imports, providers })`.
- Overriding providers via `overrideProvider(token).useValue(...)`.
- Constructor injection, `@Qualifier`, and `@AutoWired` property injection.
- Lifecycle hooks with `@PostConstruct` and `@PreDestroy`.
- Transient scope behavior (`@Service({ scope: "transient" })`).
- Isolation between two independent testing modules.

## Main File

- `src/testing.spec.ts`

The script exits with code `0` when all assertions pass.
