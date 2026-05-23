import type {
  BotAdapterInitializeOptions,
  BotMessageHandler,
  BotOutgoingMessage,
  IBotAdapter,
} from "../../interfaces/IBotAdapter";
import type { IBotContext } from "../../interfaces/IBotContext";

type TelegrafLike = {
  on: (event: string, handler: (ctx: any) => any) => any;
  launch?: () => Promise<any> | any;
  stop?: () => Promise<any> | any;
  telegram?: {
    sendMessage?: (chatId: string | number, text: string, options?: any) => Promise<any> | any;
  };
};

const normalizeText = (ctx: any): string | undefined => {
  const text = ctx?.message?.text || ctx?.update?.message?.text;
  return typeof text === "string" ? text : undefined;
};

const extractCommand = (text?: string): string | undefined => {
  if (!text || !text.startsWith("/")) {
    return undefined;
  }

  const token = text.split(/\s+/)[0];
  const [command] = token.split("@");
  return command;
};

export interface TelegrafAdapterOptions {
  name?: string;
}

export class TelegrafAdapter implements IBotAdapter {
  readonly platform = "telegram";
  readonly name: string;
  private handler?: BotMessageHandler;

  constructor(
    private readonly bot: TelegrafLike,
    options: TelegrafAdapterOptions = {}
  ) {
    this.name = options.name || "TelegrafAdapter";
  }

  setMessageHandler(handler: BotMessageHandler): void {
    this.handler = handler;
  }

  initialize(_options: BotAdapterInitializeOptions): void {
    this.bot.on("message", async (ctx: any) => {
      if (!this.handler) {
        return;
      }

      const text = normalizeText(ctx);
      const payload: IBotContext = {
        platform: this.platform,
        chatId: String(ctx?.chat?.id || ctx?.message?.chat?.id || ""),
        userId: String(ctx?.from?.id || ""),
        text,
        command: extractCommand(text),
        callbackData: ctx?.callbackQuery?.data,
        raw: ctx,
        reply: async (message, sendOptions) => {
          return ctx?.reply?.(message, sendOptions);
        },
      };

      await Promise.resolve(this.handler(payload));
    });

    this.bot.on("callback_query", async (ctx: any) => {
      if (!this.handler) {
        return;
      }

      const payload: IBotContext = {
        platform: this.platform,
        chatId: String(ctx?.chat?.id || ctx?.callbackQuery?.message?.chat?.id || ""),
        userId: String(ctx?.from?.id || ""),
        callbackData: ctx?.callbackQuery?.data,
        raw: ctx,
        reply: async (message, sendOptions) => {
          return ctx?.reply?.(message, sendOptions);
        },
      };

      await Promise.resolve(this.handler(payload));
    });
  }

  async start(): Promise<void> {
    await Promise.resolve(this.bot.launch?.());
  }

  async stop(): Promise<void> {
    await Promise.resolve(this.bot.stop?.());
  }

  async sendMessage(message: BotOutgoingMessage): Promise<any> {
    return Promise.resolve(
      this.bot.telegram?.sendMessage?.(message.chatId, message.text, message.options)
    );
  }
}
