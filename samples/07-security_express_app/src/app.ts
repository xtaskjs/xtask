import "reflect-metadata";
import express from "express";
import { join } from "path";
import { CreateApplication } from "@xtaskjs/core";
import { ExpressAdapter } from "@xtaskjs/express-http";
import {
  createMailtrapTransportOptions,
  registerEjsTemplateRenderer,
  registerMailerTemplate,
  registerMailerTransport,
} from "@xtaskjs/mailer";
import {
  SecurityValidationContext,
  registerJweStrategy,
  registerJwtStrategy,
} from "@xtaskjs/security";
import { SAMPLE_JWE_SECRET, SAMPLE_JWT_SECRET, SAMPLE_TENANT } from "./security.config";
import { UserDirectoryService } from "./user-directory.service";

const resolveValidatedUser = async (
  payload: Record<string, any>,
  context: SecurityValidationContext
) => {
  if (payload.tenant !== SAMPLE_TENANT) {
    return false;
  }

  const directory = context.container?.get(UserDirectoryService);
  const user = directory?.findActiveUser(String(payload.sub || ""));
  if (!user) {
    return false;
  }

  return {
    sub: user.id,
    name: user.name,
    roles: user.roles,
    claims: payload,
  };
};

registerJwtStrategy({
  name: "default",
  default: true,
  secretOrKey: SAMPLE_JWT_SECRET,
  validate: resolveValidatedUser,
});

registerJweStrategy({
  name: "encrypted",
  decryptionKey: SAMPLE_JWE_SECRET,
  validate: resolveValidatedUser,
});

registerMailerTransport({
  name: "default",
  defaults: {
    from: process.env.MAIL_FROM || "security-sample@xtaskjs.dev",
  },
  transport:
    process.env.MAILTRAP_SMTP_USER && process.env.MAILTRAP_SMTP_PASS
      ? createMailtrapTransportOptions({
          username: process.env.MAILTRAP_SMTP_USER,
          password: process.env.MAILTRAP_SMTP_PASS,
          host: process.env.MAILTRAP_SMTP_HOST,
          port: process.env.MAILTRAP_SMTP_PORT ? Number(process.env.MAILTRAP_SMTP_PORT) : undefined,
          secure: process.env.MAILTRAP_SMTP_SECURE === "true",
        })
      : {
          jsonTransport: true,
        },
  verifyOnStart: false,
});

      registerMailerTransport({
        name: "notifications",
        defaults: {
          from: process.env.MAIL_NOTIFICATIONS_FROM || "security-alerts@xtaskjs.dev",
        },
        transport:
          process.env.MAILTRAP_SMTP_USER && process.env.MAILTRAP_SMTP_PASS
            ? createMailtrapTransportOptions({
                username: process.env.MAILTRAP_SMTP_USER,
                password: process.env.MAILTRAP_SMTP_PASS,
                host: process.env.MAILTRAP_SMTP_HOST,
                port: process.env.MAILTRAP_SMTP_PORT ? Number(process.env.MAILTRAP_SMTP_PORT) : undefined,
                secure: process.env.MAILTRAP_SMTP_SECURE === "true",
              })
            : {
                jsonTransport: true,
              },
        verifyOnStart: false,
      });

      registerEjsTemplateRenderer({
        name: "ejs-file",
        viewsDir: join(process.cwd(), "views", "mail"),
      });

      registerMailerTemplate({
        name: "profile-summary",
        renderer: "ejs-file",
        subject: "profile-summary.subject",
        text: "profile-summary.text",
        html: "profile-summary.html",
      });

      registerMailerTemplate({
        name: "profile-notification",
        renderer: "ejs-file",
        transportName: "notifications",
        subject: "profile-notification.subject",
        text: "profile-notification.text",
      });

async function main() {
  const expressApp = express();
  expressApp.use(express.json());

  await CreateApplication({
    adapter: new ExpressAdapter(expressApp),
    autoListen: true,
    server: {
      host: "127.0.0.1",
      port: Number(process.env.PORT || 3000),
    },
  });
}

main().catch((error) => {
  console.error("Error starting the express security sample:", error);
});