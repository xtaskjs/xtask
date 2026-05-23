import type {
  BotAdapterInitializeOptions,
  BotMessageHandler,
  BotOutgoingMessage,
  IBotAdapter,
} from "../../interfaces/IBotAdapter";
import type { IBotContext } from "../../interfaces/IBotContext";

type BaileysSocketLike = {
  ev?: {
    on?: (event: string, handler: (payload: any) => any) => any;
  };
  sendMessage?: (jid: string, message: any, options?: any) => Promise<any> | any;
  end?: () => void;
};

const normalizeText = (entry: any): string | undefined => {
  return (
    entry?.message?.conversation ||
    entry?.message?.extendedTextMessage?.text ||
    entry?.message?.imageMessage?.caption ||
    undefined
  );
};

const extractCommand = (text?: string): string | undefined => {
  if (!text || !text.startsWith("/")) {
    return undefined;
  }

  return text.split(/\s+/)[0];
};

export interface BaileysAdapterOptions {
  name?: string;
}

export class BaileysAdapter implements IBotAdapter {
  readonly platform = "whatsapp";
  readonly name: string;
  private handler?: BotMessageHandler;

  constructor(
    private readonly socket: BaileysSocketLike,
    options: BaileysAdapterOptions = {}
  ) {
    this.name = options.name || "BaileysAdapter";
  }

  setMessageHandler(handler: BotMessageHandler): void {
    this.handler = handler;
  }

  initialize(_options: BotAdapterInitializeOptions): void {
    this.socket.ev?.on?.("messages.upsert", async (payload: any) => {
      if (!this.handler) {
        return;
      }

      const message = payload?.messages?.[0];
      const text = normalizeText(message);
      const context: IBotContext = {
        platform: this.platform,
        chatId: String(message?.key?.remoteJid || ""),
        userId: String(message?.key?.participant || message?.key?.remoteJid || ""),
        text,
        command: extractCommand(text),
        raw: payload,
        reply: async (replyText, replyOptions) => {
          return this.socket.sendMessage?.(
            String(message?.key?.remoteJid || ""),
            { text: replyText },
            replyOptions
          );
        },
      };

      await Promise.resolve(this.handler(context));
    });
  }

  async stop(): Promise<void> {
    this.socket.end?.();
  }

  async sendMessage(message: BotOutgoingMessage): Promise<any> {
    return Promise.resolve(
      this.socket.sendMessage?.(message.chatId, { text: message.text }, message.options)
    );
  }
}
