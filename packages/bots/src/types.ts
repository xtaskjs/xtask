import type { ApplicationLifeCycle, Container } from "@xtaskjs/core";
import type { IBotAdapter, BotOutgoingMessage } from "./interfaces/IBotAdapter";
import type { IBotContext } from "./interfaces/IBotContext";

export type BotHandlerKind = "message" | "command" | "callback";

export type BotPatternInput = string | RegExp;

export interface BotGatewayOptions {
  name?: string;
  platform?: string | string[];
  group?: string | string[];
  disabled?: boolean;
}

export interface BotGatewayMetadata {
  name?: string;
  platforms: string[];
  groups: string[];
  disabled: boolean;
}

export interface BotHandlerOptions {
  name?: string;
  disabled?: boolean;
}

export interface BotHandlerMetadata {
  kind: BotHandlerKind;
  method: string | symbol;
  command?: string;
  pattern?: BotPatternInput;
  name?: string;
  disabled?: boolean;
}

export interface BotHandlerContext {
  container?: Container;
  lifecycle?: ApplicationLifeCycle;
  adapter?: IBotAdapter;
  gateway: string;
  handler: string;
  platform: string;
  botContext: IBotContext;
}

export interface BotHandlerSummary {
  name: string;
  kind: BotHandlerKind;
  methodName: string;
  command?: string;
  pattern?: string;
  disabled: boolean;
}

export interface BotGatewaySummary {
  name: string;
  targetName: string;
  platforms: string[];
  groups: string[];
  disabled: boolean;
  handlers: BotHandlerSummary[];
}

export interface BotAdapterSummary {
  name: string;
  platform: string;
  started: boolean;
}

export interface BotsConfiguration {
  autoStart?: boolean;
  failOnDuplicateGatewayNames?: boolean;
  throwOnUnhandled?: boolean;
}

export interface DispatchedBotMessage {
  context: IBotContext;
  handled: boolean;
  handlers: string[];
}

export interface BotSendInput extends BotOutgoingMessage {
  platform: string;
}
