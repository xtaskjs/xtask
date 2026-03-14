import {
  getDefaultMailerTransportName,
  getMailerTemplateRenderer,
  getRegisteredMailerTemplate,
} from "./configuration";
import { getMailerLifecycleManager } from "./lifecycle";
import {
  MailerSendOptions,
  MailerSendResult,
  MailerTemplateRenderResult,
  MailerTemplateSendOptions,
  MailerTransporter,
} from "./types";

const normalizeTemplateOutput = (value: string | MailerTemplateRenderResult | undefined): MailerTemplateRenderResult => {
  if (typeof value === "string") {
    return { html: value };
  }

  return value || {};
};

export class MailerService {
  async sendMail(options: MailerSendOptions, transportName?: string): Promise<MailerSendResult> {
    return getMailerLifecycleManager().sendMail(options, transportName);
  }

  async renderTemplate(
    templateName: string,
    locals: Record<string, any> = {}
  ): Promise<MailerTemplateRenderResult & { transportName?: string }> {
    const definition = getRegisteredMailerTemplate(templateName);
    const renderer = getMailerTemplateRenderer(definition.renderer);
    const container = getMailerLifecycleManager().getContainer();

    const renderPart = async (template: string | undefined): Promise<string | undefined> => {
      if (!template) {
        return undefined;
      }

      const result = normalizeTemplateOutput(
        await renderer({
          name: definition.name,
          template,
          locals,
          container,
          metadata: definition.metadata,
        })
      );

      return result.subject ?? result.text ?? result.html;
    };

    return {
      subject: await renderPart(definition.subject),
      text: await renderPart(definition.text),
      html: await renderPart(definition.html),
      transportName: definition.transportName,
    };
  }

  async sendTemplate(
    templateName: string,
    locals: Record<string, any> = {},
    options: MailerTemplateSendOptions = {}
  ): Promise<MailerSendResult> {
    const rendered = await this.renderTemplate(templateName, locals);
    const { transportName, ...message } = rendered;
    return this.sendMail(
      {
        ...message,
        ...options.message,
      },
      options.transportName || transportName
    );
  }

  async verify(transportName?: string): Promise<boolean> {
    return getMailerLifecycleManager().verify(transportName);
  }

  getTransporter(transportName = getDefaultMailerTransportName() || "default"): MailerTransporter {
    return getMailerLifecycleManager().getTransporter(transportName);
  }
}