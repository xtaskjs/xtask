# 26-bots_app

Sample application using the unified `@xtaskjs/bots` package with Telegram, Slack, and WhatsApp adapters in the same runtime.

## Run

```bash
npm install
npm start
```

From this folder: `samples/26-bots_app`.

## Step-by-step walkthrough

Use this sample as the first stop to understand the unified bots runtime without external webhooks.

1. Open a terminal in this folder.
2. Install dependencies:

```bash
npm install
```

3. Run the sample:

```bash
npm start
```

4. Observe console output:
- Adapter registration for Telegram, Slack, and WhatsApp.
- Gateway discovery from decorators.
- Simulated inbound events and replies.

5. (Optional) run the local verification script:

```bash
npm test
```

### What to follow in code

- `src/app.ts`: bootstraps container/lifecycle and registers all adapters in a single `@xtaskjs/bots` runtime.
- `src/app.spec.ts`: validates command and message handling flow.

### Next sample

After this sample, continue with `samples/27-bots_webhook_security_app` to see real HTTP webhook entry points, HMAC validation, and security integration.

## What It Demonstrates

- Single package integration (`@xtaskjs/bots`) for multiple platforms.
- Decorated gateway handlers for commands, messages, and callback queries.
- Runtime adapter registration with `BotsModule`.
- Manual dispatch simulation for local development without external SDK credentials.

## Quick Test

```bash
npm test
```
