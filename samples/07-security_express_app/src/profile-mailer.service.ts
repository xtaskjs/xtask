import { Logger } from "@xtaskjs/common";
import { Service } from "@xtaskjs/core";
import { InjectMailerService, MailerService } from "@xtaskjs/mailer";

@Service()
export class ProfileMailerService {
  constructor(
    private readonly logger: Logger,
    @InjectMailerService()
    private readonly mailer: MailerService
  ) {}

  async sendProfileSummary(user: any, recipient?: string) {
    const to = recipient || user?.claims?.email || `${String(user?.sub || "user")}@example.com`;
    const roles = Array.isArray(user?.roles) ? user.roles.join(", ") : "none";

    this.logger.info(`Sending profile summary email to ${to}`);

    const locals = {
      recipient: to,
      roles,
      user,
    };
    const result = await this.mailer.sendTemplate("profile-summary", locals, {
      message: {
        to,
      },
    });
    const notificationResult = await this.mailer.sendTemplate("profile-notification", locals, {
      message: {
        to: process.env.MAIL_NOTIFICATIONS_TO || "ops@example.com",
      },
    });

    return {
      transactional: {
        accepted: (result as any).accepted || [],
        envelope: (result as any).envelope,
        messageId: result.messageId,
        transportPreview: typeof (result as any).message === "string"
          ? (result as any).message
          : Buffer.isBuffer((result as any).message)
            ? (result as any).message.toString("utf-8")
            : undefined,
      },
      notifications: {
        accepted: (notificationResult as any).accepted || [],
        envelope: (notificationResult as any).envelope,
        messageId: notificationResult.messageId,
        transportPreview: typeof (notificationResult as any).message === "string"
          ? (notificationResult as any).message
          : Buffer.isBuffer((notificationResult as any).message)
            ? (notificationResult as any).message.toString("utf-8")
            : undefined,
      },
    };
  }
}