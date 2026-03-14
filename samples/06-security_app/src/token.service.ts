import { createCipheriv, randomBytes } from "crypto";
import { Service } from "@xtaskjs/core";
import { DemoUser } from "./user-directory.service";
import { SAMPLE_JWE_SECRET, SAMPLE_JWT_SECRET, SAMPLE_TENANT } from "./security.config";

@Service()
export class TokenService {
  private readonly jsonwebtoken = require("jsonwebtoken");

  issueJwt(user: DemoUser): string {
    return this.jsonwebtoken.sign(
      {
        sub: user.id,
        tenant: SAMPLE_TENANT,
        roles: user.roles,
      },
      SAMPLE_JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "2h",
      }
    );
  }

  issueJwe(user: DemoUser): string {
    const protectedHeaderSegment = this.encodeBase64Url(
      JSON.stringify({ alg: "dir", enc: "A256GCM" })
    );
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", Buffer.from(SAMPLE_JWE_SECRET), iv);
    cipher.setAAD(Buffer.from(protectedHeaderSegment, "utf-8"));

    const payload = Buffer.from(
      JSON.stringify({
        sub: user.id,
        tenant: SAMPLE_TENANT,
        roles: user.roles,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      }),
      "utf-8"
    );

    const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [
      protectedHeaderSegment,
      "",
      this.encodeBase64Url(iv),
      this.encodeBase64Url(ciphertext),
      this.encodeBase64Url(tag),
    ].join(".");
  }

  private encodeBase64Url(value: Buffer | string): string {
    return Buffer.from(value)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }
}