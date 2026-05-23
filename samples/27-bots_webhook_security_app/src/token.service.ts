import { Service } from "@xtaskjs/core";
import { SAMPLE_JWT_SECRET, SAMPLE_TENANT } from "./security.config";

@Service()
export class TokenService {
  private readonly jsonwebtoken = require("jsonwebtoken");

  issueJwt(subject: string, roles: string[] = ["bot:webhook:reader"]): string {
    return this.jsonwebtoken.sign(
      {
        sub: subject,
        tenant: SAMPLE_TENANT,
        roles,
      },
      SAMPLE_JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "2h",
      }
    );
  }
}
