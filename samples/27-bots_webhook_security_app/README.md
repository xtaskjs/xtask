# 27-bots_webhook_security_app

Sample application showing HTTP webhooks for Slack and Telegram with unified `@xtaskjs/bots`, plus `@xtaskjs/security` JWT protection and HMAC signature validation.

## Run

```bash
npm install
npm start
```

From this folder: `samples/27-bots_webhook_security_app`.

## Step-by-step walkthrough

Use this sample after `26-bots_app` to move from simulated adapter input to real webhook HTTP endpoints.

1. Open a terminal in this folder.
2. Install dependencies:

```bash
npm install
```

3. Run automated checks first:

```bash
npm test
```

4. Start the server:

```bash
npm start
```

5. In a second terminal, send signed webhook requests automatically:

```bash
npm run curl:webhooks
```

6. (Optional) retrieve a JWT and test the protected audit route:

```bash
curl -s http://127.0.0.1:3000/auth/jwt
```

Use the returned token in:

```bash
curl -s http://127.0.0.1:3000/webhooks/audit -H "Authorization: Bearer <token>"
```

### What to follow in code

- `src/app.ts`: registers security strategy, captures raw request body, and initializes bots integration.
- `src/webhook.controller.ts`: Slack/Telegram webhook endpoints with signature checks and dispatch into `BotsService`.
- `src/webhook-signature.service.ts`: HMAC generation/verification logic.
- `src/webhook.gateway.ts`: decorated bot handlers invoked after webhook validation.
- `src/auth.controller.ts`: JWT issuance and protected audit route.

## Endpoints

- Issue JWT token:
  - `GET http://127.0.0.1:3000/auth/jwt`
- JWT-protected audit endpoint:
  - `GET http://127.0.0.1:3000/webhooks/audit`
- Slack webhook endpoint:
  - `POST http://127.0.0.1:3000/webhooks/slack`
- Telegram webhook endpoint:
  - `POST http://127.0.0.1:3000/webhooks/telegram`

## Slack HMAC signature

Slack signature base string:

`v0:{timestamp}:{rawBody}`

Digest algorithm: `HMAC-SHA256` with `SLACK_WEBHOOK_SECRET`.

## Telegram HMAC signature

Sample uses:

`HMAC-SHA256(rawBody, TELEGRAM_WEBHOOK_SECRET)`

with header `x-telegram-signature`.

## Quick test

```bash
npm test
```

## Signed curl helper

This sample includes a helper script that builds valid HMAC signatures and sends both webhook calls.

```bash
npm run curl:webhooks
```

Optional environment overrides:

```bash
BASE_URL=http://127.0.0.1:3000 \
SLACK_WEBHOOK_SECRET=xtask-bots-webhook-slack-signing-secret \
TELEGRAM_WEBHOOK_SECRET=xtask-bots-webhook-telegram-signing-secret \
npm run curl:webhooks
```
