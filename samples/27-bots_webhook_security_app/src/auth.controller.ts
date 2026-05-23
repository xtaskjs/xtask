import { Controller, Get, Req } from "@xtaskjs/common";
import { Authenticated } from "@xtaskjs/security";
import { TokenService } from "./token.service";

@Controller("/auth")
export class AuthController {
  constructor(private readonly tokens: TokenService) {}

  @Get("/jwt")
  issueJwt() {
    return {
      token: this.tokens.issueJwt("webhook-admin", ["bot:webhook:reader"]),
      format: "Bearer",
      route: "/webhooks/audit",
    };
  }
}

@Controller("/webhooks")
export class WebhookAuditController {
  @Get("/audit")
  @Authenticated()
  audit(@Req() req: any) {
    return {
      message: "Webhook audit endpoint authorized",
      user: req.user,
      auth: req.auth,
    };
  }
}
