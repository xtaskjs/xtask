# @xtaskjs/bots

Core bots integration package for xtaskjs.

This package provides:
- Common bot interfaces.
- Gateway decorators for message, command and callback handling.
- Lifecycle integration with the xtaskjs container and application lifecycle.
- Adapter registration and runtime dispatch.
- Built-in adapter wrappers for Telegram (Telegraf), Slack (Bolt) and WhatsApp (Baileys).

## Installation

```bash
npm install @xtaskjs/bots reflect-metadata
```

## Quick example

```typescript
import { Service } from "@xtaskjs/core";
import { BotGateway, OnCommand, OnMessage, initializeBotsIntegration } from "@xtaskjs/bots";

@Service()
@BotGateway("telegram")
class WelcomeGateway {
  @OnCommand("/start")
  async onStart(ctx: any) {
    await ctx.reply("Welcome to xtaskjs bots");
  }

  @OnMessage(/hello/i)
  async onHello(ctx: any) {
    await ctx.reply("Hello from xtaskjs");
  }
}

await initializeBotsIntegration(container, lifecycle);

// Optional convenience adapters
// await TelegramModule.registerTelegraf(telegrafBot);
// await SlackModule.registerBolt(slackApp);
// await WhatsappModule.registerBaileys(baileysSocket);
```
