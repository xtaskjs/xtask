# @xtaskjs/mailer

Mailer integration package for xtaskjs.

## Installation
```bash
npm install @xtaskjs/mailer nodemailer reflect-metadata
```

## What It Provides
- Nodemailer-backed delivery with xtask lifecycle integration.
- Container tokens and decorators for injecting the mailer service, lifecycle manager, or named transporters.
- Support for SMTP, Mailtrap SMTP, JSON/stream transports, and custom Nodemailer transport factories.

## Register A Transport
```typescript
import { registerMailerTransport } from "@xtaskjs/mailer";

registerMailerTransport({
  name: "default",
  defaults: {
    from: "noreply@example.com",
  },
  transport: {
    host: "smtp.example.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
  verifyOnStart: true,
});
```

## Mailtrap Helper
```typescript
import { createMailtrapTransportOptions, registerMailerTransport } from "@xtaskjs/mailer";

registerMailerTransport({
  defaults: {
    from: "sandbox@example.com",
  },
  transport: createMailtrapTransportOptions({
    username: process.env.MAILTRAP_SMTP_USER!,
    password: process.env.MAILTRAP_SMTP_PASS!,
  }),
});
```

## Inject And Send Mail
```typescript
import { Service } from "@xtaskjs/core";
import {
  InjectMailerService,
  InjectMailerTransport,
  MailerService,
  MailerTransporter,
} from "@xtaskjs/mailer";

@Service()
class WelcomeMailer {
  constructor(
    @InjectMailerService()
    private readonly mailer: MailerService,
    @InjectMailerTransport("notifications")
    private readonly notifications: MailerTransporter
  ) {}

  async sendWelcome(to: string) {
    const message = await this.mailer.sendMail({
      to,
      subject: "Welcome",
      text: "Your xtaskjs app can send mail now.",
    });

    await this.notifications.sendMail({
      to: "ops@example.com",
      subject: "Welcome email sent",
      text: `Welcome email delivered to ${to}`,
    });

    return message;
  }
}
```

## Multiple Channels
Use named transports when transactional and notification traffic should be isolated.

```typescript
registerMailerTransport({
  name: "default",
  defaults: { from: "billing@example.com" },
  transport: createMailtrapTransportOptions({
    username: process.env.MAILTRAP_SMTP_USER!,
    password: process.env.MAILTRAP_SMTP_PASS!,
  }),
});

registerMailerTransport({
  name: "notifications",
  defaults: { from: "alerts@example.com" },
  transport: { jsonTransport: true },
});
```

## Templates
`MailerService` can render and send registered templates. The package ships with a built-in `inline` renderer that interpolates `{{path.to.value}}` placeholders.

```typescript
import {
  MailerService,
  registerMailerTemplate,
  registerMailerTemplateRenderer,
} from "@xtaskjs/mailer";

registerMailerTemplate({
  name: "welcome",
  subject: "Welcome {{user.name}}",
  text: "Hello {{user.name}}",
  html: "<h1>Hello {{user.name}}</h1>",
});

registerMailerTemplateRenderer("views", async ({ template, locals }) => {
  return renderSomeViewEngine(template, locals);
});

registerMailerTemplate({
  name: "invoice-html",
  renderer: "views",
  html: "emails/invoice",
  transportName: "default",
});

await mailer.sendTemplate("welcome", {
  user: { name: "Ada" },
}, {
  message: {
    to: "ada@example.com",
  },
});
```

For view engines like EJS, Handlebars, or Nunjucks, register a custom renderer that interprets `subject`, `text`, or `html` values as template names or file paths.

### EJS File Renderer
The package includes `registerEjsTemplateRenderer()` so templates can point at actual `.ejs` files.

```typescript
import { join } from "path";
import {
  registerEjsTemplateRenderer,
  registerMailerTemplate,
} from "@xtaskjs/mailer";

registerEjsTemplateRenderer({
  name: "ejs-file",
  viewsDir: join(process.cwd(), "views", "mail"),
});

registerMailerTemplate({
  name: "welcome",
  renderer: "ejs-file",
  subject: "welcome.subject",
  text: "welcome.text",
  html: "welcome.html",
});
```

### Handlebars File Renderer
The package also includes `registerHandlebarsTemplateRenderer()` for `.hbs` templates and optional helpers/partials.

```typescript
import { join } from "path";
import {
  registerHandlebarsTemplateRenderer,
  registerMailerTemplate,
} from "@xtaskjs/mailer";

registerHandlebarsTemplateRenderer({
  name: "handlebars-file",
  viewsDir: join(process.cwd(), "views", "mail"),
  helpers: {
    upper: (value: string) => String(value || "").toUpperCase(),
  },
});

registerMailerTemplate({
  name: "welcome-admin",
  renderer: "handlebars-file",
  subject: "welcome.subject",
  text: "welcome.text",
  html: "welcome.html",
});
```

## Lifecycle Behavior
- During `CreateApplication()`: registered transports are created before container lifecycle listeners are resolved.
- During `app.close()`: transporters are closed before the DI container is destroyed.