import type { Container } from "@xtaskjs/core";
import type ejs from "ejs";
import type Handlebars from "handlebars";
import { SendMailOptions, Transport, TransportOptions, Transporter } from "nodemailer";
import JSONTransport = require("nodemailer/lib/json-transport");
import Mail = require("nodemailer/lib/mailer");
import SMTPTransport = require("nodemailer/lib/smtp-transport");
import StreamTransport = require("nodemailer/lib/stream-transport");

export type MailerTransportInput =
  | string
  | SMTPTransport
  | SMTPTransport.Options
  | JSONTransport
  | JSONTransport.Options
  | StreamTransport
  | StreamTransport.Options
  | Transport
  | TransportOptions;
export type MailerTransportDefaults = Mail.Options;
export type MailerTransporter = Transporter;
export type MailerSendOptions = SendMailOptions;
export type MailerSendResult = Awaited<ReturnType<Transporter["sendMail"]>>;
export type MailerTemplateLocals = Record<string, any>;

export interface MailerTemplateRenderResult {
  subject?: string;
  text?: string;
  html?: string;
}

export interface MailerTemplateRendererContext {
  name?: string;
  template: string;
  locals: MailerTemplateLocals;
  container?: Container;
  metadata?: Record<string, any>;
}

export type MailerTemplateRenderer = (
  context: MailerTemplateRendererContext
) => string | MailerTemplateRenderResult | Promise<string | MailerTemplateRenderResult>;

export interface RegisteredMailerTemplateOptions {
  name: string;
  renderer: string;
  subject?: string;
  text?: string;
  html?: string;
  transportName?: string;
  metadata?: Record<string, any>;
}

export interface MailerTemplateOptions extends Omit<RegisteredMailerTemplateOptions, "name" | "renderer"> {
  name?: string;
  renderer?: string;
}

export interface MailerTemplateSendOptions {
  message?: Omit<MailerSendOptions, "subject" | "text" | "html"> & Partial<MailerTemplateRenderResult>;
  transportName?: string;
}

export interface MailerTransportFactoryContext {
  name: string;
  container?: Container;
}

export type MailerTransportFactory = (
  context: MailerTransportFactoryContext
) =>
  | MailerTransportInput
  | MailerTransporter
  | Promise<MailerTransportInput | MailerTransporter>;

export interface RegisteredMailerTransportOptions {
  name: string;
  transport: MailerTransportInput | MailerTransportFactory | MailerTransporter;
  defaults?: MailerTransportDefaults;
  verifyOnStart?: boolean;
  closeOnShutdown?: boolean;
}

export interface MailerTransportOptions extends Omit<RegisteredMailerTransportOptions, "name"> {
  name?: string;
}

export interface MailtrapTransportOptions {
  username: string;
  password: string;
  host?: string;
  port?: number;
  secure?: boolean;
}

export interface MailerEjsRendererOptions {
  name?: string;
  viewsDir: string;
  extension?: string;
  renderOptions?: ejs.Options;
}

export interface MailerHandlebarsRendererOptions {
  name?: string;
  viewsDir: string;
  extension?: string;
  helpers?: Handlebars.HelperDeclareSpec;
  partials?: Record<string, string>;
}