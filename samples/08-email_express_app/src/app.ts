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
import { ConfigModule } from "@xtaskjs/config";
import { z } from "zod";
const SampleConfigSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  XTASK_DI_STRATEGY: z.enum(["lazy", "eager"]).default("lazy"),
  XTASK_DI_METRICS: z.enum(["true", "false"]).default("true"),
  XTASK_HOT_DEBOUNCE_MS: z.coerce.number().int().nonnegative().default(60),
});

ConfigModule.register({
  schema: SampleConfigSchema,
  envFiles: [".env", ".env.local"],
});

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
    container: {
      resolutionStrategy: process.env.XTASK_DI_STRATEGY === "eager" ? "eager" : "lazy",
      metricsEnabled: process.env.XTASK_DI_METRICS !== "false",
    },
    hotManifestWatcher: {
      enabled: process.env.NODE_ENV === "development",
      debounceMs: Number(process.env.XTASK_HOT_DEBOUNCE_MS || 60),
    },
    prebuiltManifest: {
      enabled: process.env.NODE_ENV === "production",
    },
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