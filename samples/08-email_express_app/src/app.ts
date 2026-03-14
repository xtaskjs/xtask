import "dotenv/config";
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

registerMailerTransport({
  name: "default",
  defaults: {
    from: process.env.MAIL_FROM || "hello@xtaskjs.dev",
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
    from: process.env.MAIL_NOTIFICATIONS_FROM || "alerts@xtaskjs.dev",
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
  name: "welcome-email",
  renderer: "ejs-file",
  subject: "welcome.subject",
  text: "welcome.text",
  html: "welcome.html",
});

registerMailerTemplate({
  name: "campaign-email",
  renderer: "ejs-file",
  subject: "campaign.subject",
  text: "campaign.text",
  html: "campaign.html",
});

registerMailerTemplate({
  name: "ops-notification",
  renderer: "ejs-file",
  transportName: "notifications",
  subject: "ops.subject",
  text: "ops.text",
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
  console.error("Error starting the email express sample:", error);
});