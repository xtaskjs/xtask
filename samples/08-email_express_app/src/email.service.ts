import { Logger } from "@xtaskjs/common";
import { Service } from "@xtaskjs/core";
import { InjectMailerService, MailerService } from "@xtaskjs/mailer";

const toPreview = (result: any) => {
  const message = result?.message;
  return typeof message === "string"
    ? message
    : Buffer.isBuffer(message)
      ? message.toString("utf-8")
      : undefined;
};

@Service()
export class EmailService {
  constructor(
    private readonly logger: Logger,
    @InjectMailerService()
    private readonly mailer: MailerService
  ) {}

  async sendWelcomeEmail(input: { to: string; name: string; product?: string }) {
    const locals = {
      name: input.name,
      product: input.product || "xTaskJS Mailer",
      supportEmail: process.env.MAIL_SUPPORT_TO || "support@xtaskjs.dev",
      to: input.to,
      type: "welcome",
    };

    this.logger.info(`Sending welcome email to ${input.to}`);

    const delivery = await this.mailer.sendTemplate("welcome-email", locals, {
      message: { to: input.to },
    });
    const ops = await this.mailer.sendTemplate("ops-notification", locals, {
      message: { to: process.env.MAIL_NOTIFICATIONS_TO || "ops@xtaskjs.dev" },
    });

    return {
      template: "welcome-email",
      delivery: {
        messageId: delivery.messageId,
        accepted: (delivery as any).accepted || [],
        preview: toPreview(delivery),
      },
      notification: {
        messageId: ops.messageId,
        accepted: (ops as any).accepted || [],
        preview: toPreview(ops),
      },
    };
  }

  async sendCampaignEmail(input: {
    to: string;
    name: string;
    campaign: string;
    ctaUrl: string;
  }) {
    const locals = {
      name: input.name,
      campaign: input.campaign,
      ctaUrl: input.ctaUrl,
      to: input.to,
      type: "campaign",
    };

    this.logger.info(`Sending campaign email '${input.campaign}' to ${input.to}`);

    const delivery = await this.mailer.sendTemplate("campaign-email", locals, {
      message: { to: input.to },
    });
    const ops = await this.mailer.sendTemplate("ops-notification", locals, {
      message: { to: process.env.MAIL_NOTIFICATIONS_TO || "ops@xtaskjs.dev" },
    });

    return {
      template: "campaign-email",
      delivery: {
        messageId: delivery.messageId,
        accepted: (delivery as any).accepted || [],
        preview: toPreview(delivery),
      },
      notification: {
        messageId: ops.messageId,
        accepted: (ops as any).accepted || [],
        preview: toPreview(ops),
      },
    };
  }
}