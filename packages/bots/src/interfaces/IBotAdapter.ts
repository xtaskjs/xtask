import type { IBotContext } from "./IBotContext";
import type { BotContainerLike, BotLifecycleLike } from "../types";

export type BotMessageHandler = (context: IBotContext) => Promise<void> | void;

export interface BotOutgoingMessage {
  chatId: string;
  text: string;
  options?: Record<string, any>;
}

export interface BotAdapterInitializeOptions {
  container?: BotContainerLike;
  lifecycle?: BotLifecycleLike;
}

export interface IBotAdapter {
  readonly platform: string;
  readonly name: string;
  initialize?: (options: BotAdapterInitializeOptions) => Promise<void> | void;
  setMessageHandler: (handler: BotMessageHandler) => void;
  start?: () => Promise<void> | void;
  stop?: () => Promise<void> | void;
  sendMessage?: (message: BotOutgoingMessage) => Promise<any> | any;
}
