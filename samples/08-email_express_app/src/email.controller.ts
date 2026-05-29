import { Body, Controller, Get, Logger, Post } from "@xtaskjs/common";
import { SchemaDto } from "@xtaskjs/validation";
import { z } from "zod";
import { EmailService } from "./email.service";

@SchemaDto(
  z.object({
    to: z.string().trim().email(),
    name: z.string().trim().min(1),
    product: z.string().trim().min(1).optional(),
  })
)
class SendWelcomeEmailDto {
  to!: string;

  name!: string;

  product?: string;
}

@SchemaDto(
  z.object({
    to: z.string().trim().email(),
    name: z.string().trim().min(1),
    campaign: z.string().trim().min(1),
    ctaUrl: z.string().trim().url(),
  })
)
class SendCampaignEmailDto {
  to!: string;

  name!: string;

  campaign!: string;

  ctaUrl!: string;
}

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
  async sendWelcome(@Body() body: SendWelcomeEmailDto) {
    this.logger.info(`Received welcome email request for ${body.to}`);

    return this.emails.sendWelcomeEmail(body);
  }

  @Post("/campaign")
  async sendCampaign(@Body() body: SendCampaignEmailDto) {
    this.logger.info(`Received campaign email request for ${body.to}`);

    return this.emails.sendCampaignEmail(body);
  }
}