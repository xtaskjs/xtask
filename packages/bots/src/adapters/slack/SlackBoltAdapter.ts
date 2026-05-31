import type {
  BotAdapterInitializeOptions,
  BotMessageHandler,
  BotOutgoingMessage,
  IBotAdapter,
} from "../../interfaces/IBotAdapter";
import type { IBotContext } from "../../interfaces/IBotContext";

type SlackEvent = {
  text?: string;
  channel?: string;
  user?: string;
};

type SlackEventPayload = {
  event?: SlackEvent;
  say?: (message: string, options?: Record<string, unknown>) => Promise<unknown> | unknown;
};

type SlackBoltLike = {
  event: (name: string, handler: (payload: SlackEventPayload) => Promise<void> | void) => void;
  command?: (name: string, handler: (payload: SlackEventPayload) => Promise<void> | void) => void;
  start?: () => Promise<unknown> | unknown;
  stop?: () => Promise<unknown> | unknown;
  client?: {
    chat?: {
      postMessage?: (options: Record<string, unknown>) => Promise<unknown> | unknown;
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
    this.app.event("message", async ({ event, say }: SlackEventPayload) => {
      if (!this.handler) {
        return;
      }

      const text = event?.text;
      const payload: IBotContext = {
        platform: this.platform,
        chatId: event?.channel || "",
        userId: event?.user || "",
        text,
        command: extractCommand(text),
        raw: event,
        reply: (message, sendOptions) => {
          return Promise.resolve(say?.(message, sendOptions));
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

  async sendMessage(message: BotOutgoingMessage): Promise<unknown> {
    return Promise.resolve(
      this.app.client?.chat?.postMessage?.({
        channel: message.chatId,
        text: message.text,
        ...(message.options || {}),
      })
    );
  }
}
