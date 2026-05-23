import type {
  BotAdapterInitializeOptions,
  BotMessageHandler,
  BotOutgoingMessage,
  IBotAdapter,
} from "../../interfaces/IBotAdapter";
import type { IBotContext } from "../../interfaces/IBotContext";

type SlackBoltLike = {
  event: (name: string, handler: (payload: any) => any) => any;
  command?: (name: string, handler: (payload: any) => any) => any;
  start?: () => Promise<any> | any;
  stop?: () => Promise<any> | any;
  client?: {
    chat?: {
      postMessage?: (options: any) => Promise<any> | any;
    };
  };
};

const extractCommand = (text?: string): string | undefined => {
  if (!text || !text.startsWith("/")) {
    return undefined;
  }

  return text.split(/\s+/)[0];
};

export interface SlackBoltAdapterOptions {
  name?: string;
}

export class SlackBoltAdapter implements IBotAdapter {
  readonly platform = "slack";
  readonly name: string;
  private handler?: BotMessageHandler;

  constructor(
    private readonly app: SlackBoltLike,
    options: SlackBoltAdapterOptions = {}
  ) {
    this.name = options.name || "SlackBoltAdapter";
  }

  setMessageHandler(handler: BotMessageHandler): void {
    this.handler = handler;
  }

  initialize(_options: BotAdapterInitializeOptions): void {
    this.app.event("message", async ({ event, say }: any) => {
      if (!this.handler) {
        return;
      }

      const text = event?.text;
      const payload: IBotContext = {
        platform: this.platform,
        chatId: String(event?.channel || ""),
        userId: String(event?.user || ""),
        text,
        command: extractCommand(text),
        raw: event,
        reply: async (message, sendOptions) => {
          return say?.(message, sendOptions);
        },
      };

      await Promise.resolve(this.handler(payload));
    });
  }

  async start(): Promise<void> {
    await Promise.resolve(this.app.start?.());
  }

  async stop(): Promise<void> {
    await Promise.resolve(this.app.stop?.());
  }

  async sendMessage(message: BotOutgoingMessage): Promise<any> {
    return Promise.resolve(
      this.app.client?.chat?.postMessage?.({
        channel: message.chatId,
        text: message.text,
        ...(message.options || {}),
      })
    );
  }
}
