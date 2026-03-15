import { Body, Controller, Get, Logger, Post } from "@xtaskjs/common";
import { Transform } from "class-transformer";
import { IsEmail, IsOptional, IsString, IsUrl, MinLength } from "class-validator";
import { EmailService } from "./email.service";

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

class SendWelcomeEmailDto {
  @Transform(trimString)
  @IsEmail()
  to!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  name!: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  product?: string;
}

class SendCampaignEmailDto {
  @Transform(trimString)
  @IsEmail()
  to!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  name!: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  campaign!: string;

  @Transform(trimString)
  @IsUrl({ require_tld: false })
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