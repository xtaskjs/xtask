import type {
  BotAdapterInitializeOptions,
  BotMessageHandler,
  BotOutgoingMessage,
  IBotAdapter,
} from "../../interfaces/IBotAdapter";
import type { IBotContext } from "../../interfaces/IBotContext";

export interface WhatsappAdapterOptions {
  name?: string;
  sender?: (message: BotOutgoingMessage) => Promise<any> | any;
  onInitialize?: (options: BotAdapterInitializeOptions) => Promise<void> | void;
  onStart?: () => Promise<void> | void;
  onStop?: () => Promise<void> | void;
}

export class WhatsappAdapter implements IBotAdapter {
  readonly platform = "whatsapp";
  readonly name: string;
  private readonly options: WhatsappAdapterOptions;
  private handler?: BotMessageHandler;

  constructor(options: WhatsappAdapterOptions = {}) {
    this.options = options;
    this.name = options.name || "WhatsappAdapter";
  }

  setMessageHandler(handler: BotMessageHandler): void {
    this.handler = handler;
  }

  async initialize(options: BotAdapterInitializeOptions): Promise<void> {
    if (this.options.onInitialize) {
      await Promise.resolve(this.options.onInitialize(options));
    }
  }

  async start(): Promise<void> {
    if (this.options.onStart) {
      await Promise.resolve(this.options.onStart());
    }
  }

  async stop(): Promise<void> {
    if (this.options.onStop) {
      await Promise.resolve(this.options.onStop());
    }
  }

  async sendMessage(message: BotOutgoingMessage): Promise<any> {
    if (!this.options.sender) {
      return undefined;
    }

    return Promise.resolve(this.options.sender(message));
  }

  async receive(context: Omit<IBotContext, "platform">): Promise<void> {
    if (!this.handler) {
      return;
    }

    await Promise.resolve(
      this.handler({
        ...context,
        platform: this.platform,
      })
    );
  }
}
