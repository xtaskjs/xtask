import { Body, Controller, Post, Req } from "@xtaskjs/common";
import { BotsModule } from "@xtaskjs/bots";
import { AllowAnonymous } from "@xtaskjs/security";
import { WebhookSignatureService } from "./webhook-signature.service";

const asRawBody = (request: any): string => {
  if (typeof request?.rawBody === "string") {
    return request.rawBody;
  }

  return JSON.stringify(request?.body || {});
};

@Controller("/webhooks")
export class WebhookController {
  constructor(private readonly signatures: WebhookSignatureService) {}

  @Post("/slack")
  @AllowAnonymous()
  async slack(@Req() req: any, @Body() body: any) {
    const timestamp = String(req?.headers?.["x-slack-request-timestamp"] || "");
    const signature = String(req?.headers?.["x-slack-signature"] || "");
    const rawBody = asRawBody(req);

    const valid = this.signatures.verifySlackSignature(timestamp, signature, rawBody);
    if (!valid) {
      throw new Error("Invalid Slack webhook signature");
    }

    const text = body?.text || body?.event?.text || "";
    const chatId = String(body?.channel_id || body?.event?.channel || "slack-channel");
    const userId = String(body?.user_id || body?.event?.user || "unknown");

    const result = await BotsModule.service().dispatch({
      platform: "slack",
      chatId,
      userId,
      text,
      payload: body,
      raw: body,
      reply: async (replyText: string) => {
        return {
          ok: true,
          text: replyText,
        };
      },
    });

    return {
      ok: true,
      platform: "slack",
      handled: result.handled,
      handlers: result.handlers,
    };
  }

  @Post("/telegram")
  @AllowAnonymous()
  async telegram(@Req() req: any, @Body() body: any) {
    const signature = String(req?.headers?.["x-telegram-signature"] || "");
    const rawBody = asRawBody(req);

    const valid = this.signatures.verifyTelegramSignature(signature, rawBody);
    if (!valid) {
      throw new Error("Invalid Telegram webhook signature");
    }

    const text = body?.message?.text || "";
    const chatId = String(body?.message?.chat?.id || "telegram-chat");
    const userId = String(body?.message?.from?.id || "unknown");

    const result = await BotsModule.service().dispatch({
      platform: "telegram",
      chatId,
      userId,
      text,
      payload: body,
      raw: body,
      reply: async (replyText: string) => {
        return {
          ok: true,
          text: replyText,
        };
      },
    });

    return {
      ok: true,
      platform: "telegram",
      handled: result.handled,
      handlers: result.handlers,
    };
  }
}
