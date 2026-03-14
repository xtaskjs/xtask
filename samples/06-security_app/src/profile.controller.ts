import { Auth, Authenticated, Roles } from "@xtaskjs/security";
import { Controller, Get, Logger } from "@xtaskjs/common";

@Controller("/me")
export class ProfileController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  @Authenticated()
  profile(req: any) {
    this.logger.info("Returning JWT-protected profile");
    return {
      message: "Authenticated with JWT",
      user: req.user,
      auth: req.auth,
    };
  }
}

@Controller("/admin")
export class AdminController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  @Authenticated()
  @Roles("admin")
  dashboard(req: any) {
    this.logger.info("Returning admin-only resource");
    return {
      message: "Admin route granted",
      user: req.user.sub,
      roles: req.auth.roles,
    };
  }
}

@Controller("/encrypted")
export class EncryptedController {
  constructor(private readonly logger: Logger) {}

  @Get("/")
  @Auth("encrypted")
  encrypted(req: any) {
    this.logger.info("Returning JWE-protected resource");
    return {
      message: "Authenticated with JWE",
      user: req.user.sub,
      auth: req.auth,
    };
  }
}