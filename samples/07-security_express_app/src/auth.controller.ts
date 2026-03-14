import { Controller, Get, Logger } from "@xtaskjs/common";
import { TokenService } from "./token.service";
import { UserDirectoryService } from "./user-directory.service";

@Controller("/auth")
export class AuthController {
  constructor(
    private readonly logger: Logger,
    private readonly tokens: TokenService,
    private readonly users: UserDirectoryService
  ) {}

  @Get("/jwt/admin")
  issueJwtAdmin() {
    return this.issueJwt("admin");
  }

  @Get("/jwt/viewer")
  issueJwtViewer() {
    return this.issueJwt("viewer");
  }

  @Get("/jwe/admin")
  issueJweAdmin() {
    const user = this.users.findActiveUser("admin");
    if (!user) {
      throw new Error("Demo user 'admin' was not found");
    }

    this.logger.info("Issuing JWE token for admin sample user");
    return {
      token: this.tokens.issueJwe(user),
      format: "Bearer",
      route: "/encrypted/",
      user: user.id,
    };
  }

  private issueJwt(userId: string) {
    const user = this.users.findActiveUser(userId);
    if (!user) {
      throw new Error(`Demo user '${userId}' was not found`);
    }

    this.logger.info(`Issuing JWT token for ${userId} sample user`);
    return {
      token: this.tokens.issueJwt(user),
      format: "Bearer",
      route: userId === "admin" ? "/admin/" : "/me/",
      user: user.id,
      roles: user.roles,
    };
  }
}