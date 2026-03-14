import { Controller, Get, Logger, Post } from "@xtaskjs/common";
import { EmailService } from "./email.service";

@Controller("/email")
export class EmailController {
  constructor(
    private readonly logger: Logger,
    private readonly emails: EmailService
  ) {}

  @Get("/")
  describe() {
    return {
      sample: "08-email_express_app",
      endpoints: [
        "POST /email/welcome",
        "POST /email/campaign",
      ],
    };
  }

  @Post("/welcome")
  async sendWelcome(req: any) {
    const to = String(req.body?.to || "").trim();
    const name = String(req.body?.name || "").trim();
    const product = String(req.body?.product || "").trim() || undefined;

    if (!to || !name) {
      throw new Error("Request body requires 'to' and 'name'");
    }

    this.logger.info(`Received welcome email request for ${to}`);

    return this.emails.sendWelcomeEmail({ to, name, product });
  }

  @Post("/campaign")
  async sendCampaign(req: any) {
    const to = String(req.body?.to || "").trim();
    const name = String(req.body?.name || "").trim();
    const campaign = String(req.body?.campaign || "").trim();
    const ctaUrl = String(req.body?.ctaUrl || "").trim();

    if (!to || !name || !campaign || !ctaUrl) {
      throw new Error("Request body requires 'to', 'name', 'campaign', and 'ctaUrl'");
    }

    this.logger.info(`Received campaign email request for ${to}`);

    return this.emails.sendCampaignEmail({ to, name, campaign, ctaUrl });
  }
}