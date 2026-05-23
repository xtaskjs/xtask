import type { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import type { IBotContext } from "./IBotContext";

export type BotMessageHandler = (context: IBotContext) => Promise<void> | void;

export interface BotOutgoingMessage {
  chatId: string;
  text: string;
  options?: Record<string, any>;
}

export interface BotAdapterInitializeOptions {
  container?: Container;
  lifecycle?: ApplicationLifeCycle;
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
