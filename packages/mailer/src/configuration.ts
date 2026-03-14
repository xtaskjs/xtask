import {
  MailerTemplateOptions,
  MailerTemplateRenderer,
  MailerTemplateRendererContext,
  MailerTransportInput,
  MailerTransportOptions,
  MailtrapTransportOptions,
  RegisteredMailerTemplateOptions,
  RegisteredMailerTransportOptions,
} from "./types";

const DEFAULT_TRANSPORT_NAME = "default";
const DEFAULT_TEMPLATE_RENDERER = "inline";
const registeredTransports = new Map<string, RegisteredMailerTransportOptions>();
const registeredTemplates = new Map<string, RegisteredMailerTemplateOptions>();

const resolvePath = (source: Record<string, any>, path: string): any => {
  return path.split(".").reduce<any>((current, segment) => current?.[segment], source);
};

const inlineTemplateRenderer: MailerTemplateRenderer = ({ template, locals }: MailerTemplateRendererContext) => {
  return template.replace(/\{\{\s*([\w$.]+)\s*\}\}/g, (_match, path) => {
    const value = resolvePath(locals, String(path));
    return value === undefined || value === null ? "" : String(value);
  });
};

const templateRenderers = new Map<string, MailerTemplateRenderer>([
  [DEFAULT_TEMPLATE_RENDERER, inlineTemplateRenderer],
]);

const resolveTransportName = (requestedName?: string): string => {
  if (typeof requestedName === "string" && requestedName.trim().length > 0) {
    return requestedName.trim();
  }

  if (!registeredTransports.has(DEFAULT_TRANSPORT_NAME)) {
    return DEFAULT_TRANSPORT_NAME;
  }

  return `mailer-${registeredTransports.size + 1}`;
};

export const registerMailerTransport = (
  options: MailerTransportOptions
): RegisteredMailerTransportOptions => {
  const name = resolveTransportName(options.name);
  const definition: RegisteredMailerTransportOptions = {
    closeOnShutdown: options.closeOnShutdown !== false,
    ...options,
    name,
  };
  registeredTransports.set(name, definition);
  return definition;
};

export const getRegisteredMailerTransports = (): RegisteredMailerTransportOptions[] => {
  return Array.from(registeredTransports.values());
};

export const clearRegisteredMailerTransports = (): void => {
  registeredTransports.clear();
};

export const registerMailerTemplateRenderer = (
  name: string,
  renderer: MailerTemplateRenderer
): MailerTemplateRenderer => {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("Mailer template renderer requires a non-empty name");
  }

  templateRenderers.set(normalizedName, renderer);
  return renderer;
};

export const getMailerTemplateRenderer = (name = DEFAULT_TEMPLATE_RENDERER): MailerTemplateRenderer => {
  const renderer = templateRenderers.get(name);
  if (!renderer) {
    throw new Error(`Mailer template renderer '${name}' is not registered`);
  }
  return renderer;
};

export const clearRegisteredMailerTemplateRenderers = (): void => {
  templateRenderers.clear();
  templateRenderers.set(DEFAULT_TEMPLATE_RENDERER, inlineTemplateRenderer);
};

export const registerMailerTemplate = (
  options: MailerTemplateOptions
): RegisteredMailerTemplateOptions => {
  const name = typeof options.name === "string" && options.name.trim().length > 0
    ? options.name.trim()
    : `template-${registeredTemplates.size + 1}`;
  const renderer = options.renderer || DEFAULT_TEMPLATE_RENDERER;
  const definition: RegisteredMailerTemplateOptions = {
    ...options,
    name,
    renderer,
  };
  registeredTemplates.set(name, definition);
  return definition;
};

export const getRegisteredMailerTemplates = (): RegisteredMailerTemplateOptions[] => {
  return Array.from(registeredTemplates.values());
};

export const getRegisteredMailerTemplate = (name: string): RegisteredMailerTemplateOptions => {
  const template = registeredTemplates.get(name);
  if (!template) {
    throw new Error(`Mailer template '${name}' is not registered`);
  }
  return template;
};

export const clearRegisteredMailerTemplates = (): void => {
  registeredTemplates.clear();
};

export const getDefaultMailerTransportName = (): string | undefined => {
  if (registeredTransports.has(DEFAULT_TRANSPORT_NAME)) {
    return DEFAULT_TRANSPORT_NAME;
  }

  if (registeredTransports.size === 1) {
    return Array.from(registeredTransports.keys())[0];
  }

  return undefined;
};

export const MailerTransport = (options: MailerTransportOptions): ClassDecorator => {
  return () => {
    registerMailerTransport(options);
  };
};

export const MailerTemplate = (options: MailerTemplateOptions): ClassDecorator => {
  return () => {
    registerMailerTemplate(options);
  };
};

export const createMailtrapTransportOptions = (
  options: MailtrapTransportOptions
): MailerTransportInput => {
  return {
    host: options.host || "sandbox.smtp.mailtrap.io",
    port: options.port || 2525,
    secure: options.secure === true,
    auth: {
      user: options.username,
      pass: options.password,
    },
  };
};