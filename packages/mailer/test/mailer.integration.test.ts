import "reflect-metadata";
import { describe, afterEach, beforeEach, expect, test } from "@jest/globals";
import { Container, Service } from "@xtaskjs/core";
import { join } from "path";
import {
  InjectMailerTransport,
  InjectMailerService,
  MailerService,
  clearRegisteredMailerTemplateRenderers,
  clearRegisteredMailerTemplates,
  clearRegisteredMailerTransports,
  createMailtrapTransportOptions,
  getMailerLifecycleManager,
  getMailerServiceToken,
  getMailerTransportToken,
  initializeMailerIntegration,
  registerEjsTemplateRenderer,
  registerHandlebarsTemplateRenderer,
  registerMailerTemplate,
  registerMailerTemplateRenderer,
  registerMailerTransport,
  shutdownMailerIntegration,
} from "../src";

describe("@xtaskjs/mailer integration", () => {
  beforeEach(async () => {
    clearRegisteredMailerTemplateRenderers();
    clearRegisteredMailerTemplates();
    clearRegisteredMailerTransports();
    await shutdownMailerIntegration();
  });

  afterEach(async () => {
    clearRegisteredMailerTemplateRenderers();
    clearRegisteredMailerTemplates();
    clearRegisteredMailerTransports();
    await shutdownMailerIntegration();
  });

  test("initializes a json transport and sends mail through the service", async () => {
    registerMailerTransport({
      name: "default",
      defaults: {
        from: "noreply@xtaskjs.dev",
      },
      transport: {
        jsonTransport: true,
      },
    });
    registerMailerTransport({
      name: "notifications",
      defaults: {
        from: "alerts@xtaskjs.dev",
      },
      transport: {
        jsonTransport: true,
      },
    });

    const container = new Container();
    await initializeMailerIntegration(container);

    @Service()
    class NotificationService {
      constructor(
        @InjectMailerService()
        public readonly mailer: MailerService,
        @InjectMailerTransport("notifications")
        public readonly notificationsTransport: any
      ) {}
    }

    container.register(NotificationService, { scope: "singleton" });

    const notification = container.get(NotificationService);
    const mailerByName = container.getByName<MailerService>(getMailerServiceToken());
    const transporter = container.getByName<any>(getMailerTransportToken());
    const notificationsTransport = container.getByName<any>(getMailerTransportToken("notifications"));

    expect(notification.mailer).toBeInstanceOf(MailerService);
    expect(typeof notification.notificationsTransport.sendMail).toBe("function");
    expect(mailerByName).toBeInstanceOf(MailerService);
    expect(typeof transporter.sendMail).toBe("function");
    expect(typeof notificationsTransport.sendMail).toBe("function");

    const result = await notification.mailer.sendMail({
      to: "user@example.com",
      subject: "Welcome",
      text: "Hello from xtaskjs mailer",
    });
    const notificationResult = await notification.mailer.sendMail(
      {
        to: "ops@example.com",
        subject: "Alert",
        text: "This used the notifications transport",
      },
      "notifications"
    );

    expect(result.messageId).toBeTruthy();
    expect(String((result as any).message)).toContain("Hello from xtaskjs mailer");
    expect(notificationResult.messageId).toBeTruthy();
    expect(String((notificationResult as any).message)).toContain("This used the notifications transport");
  });

  test("creates mailtrap SMTP options and resolves registered transport names", async () => {
    const options = createMailtrapTransportOptions({
      username: "mailtrap-user",
      password: "mailtrap-pass",
    }) as any;

    expect(options.host).toBe("sandbox.smtp.mailtrap.io");
    expect(options.port).toBe(2525);
    expect(options.auth.user).toBe("mailtrap-user");

    registerMailerTransport({
      transport: {
        jsonTransport: true,
      },
    });
    registerMailerTransport({
      name: "notifications",
      transport: {
        jsonTransport: true,
      },
    });

    await initializeMailerIntegration();

    expect(getMailerLifecycleManager().listTransportNames()).toEqual(["default", "notifications"]);
    expect(getMailerLifecycleManager().isInitialized("default")).toBe(true);
    expect(getMailerLifecycleManager().isInitialized("notifications")).toBe(true);
  });

  test("renders and sends registered templates", async () => {
    registerMailerTransport({
      name: "default",
      defaults: {
        from: "noreply@xtaskjs.dev",
      },
      transport: {
        jsonTransport: true,
      },
    });
    registerMailerTemplate({
      name: "welcome",
      subject: "Welcome {{user.name}}",
      text: "Hello {{user.name}}, your role is {{user.role}}.",
      html: "<h1>Hello {{user.name}}</h1><p>Your role is {{user.role}}.</p>",
    });
    registerMailerTemplateRenderer("uppercase", ({ template, locals }) => {
      return template.replace("{{value}}", String(locals.value || "").toUpperCase());
    });
    registerMailerTemplate({
      name: "alert",
      renderer: "uppercase",
      transportName: "default",
      subject: "ALERT {{value}}",
      text: "alert {{value}}",
    });

    const container = new Container();
    await initializeMailerIntegration(container);

    @Service()
    class TemplateService {
      constructor(@InjectMailerService() public readonly mailer: MailerService) {}
    }

    container.register(TemplateService, { scope: "singleton" });
    const service = container.get(TemplateService);

    const rendered = await service.mailer.renderTemplate("welcome", {
      user: { name: "Ada", role: "admin" },
    });
    const result = await service.mailer.sendTemplate(
      "alert",
      { value: "disk space" },
      {
        message: {
          to: "ops@example.com",
        },
      }
    );

    expect(rendered.subject).toBe("Welcome Ada");
    expect(rendered.text).toContain("your role is admin");
    expect(rendered.html).toContain("<h1>Hello Ada</h1>");
    expect(String((result as any).message)).toContain("ALERT DISK SPACE");
  });

  test("renders templates from EJS view files", async () => {
    registerMailerTransport({
      name: "default",
      defaults: {
        from: "noreply@xtaskjs.dev",
      },
      transport: {
        jsonTransport: true,
      },
    });
    registerEjsTemplateRenderer({
      viewsDir: join(__dirname, "fixtures", "ejs"),
    });
    registerMailerTemplate({
      name: "ejs-welcome",
      renderer: "ejs-file",
      subject: "welcome.subject",
      text: "welcome.text",
      html: "welcome.html",
    });

    const container = new Container();
    await initializeMailerIntegration(container);

    @Service()
    class TemplateService {
      constructor(@InjectMailerService() public readonly mailer: MailerService) {}
    }

    container.register(TemplateService, { scope: "singleton" });
    const service = container.get(TemplateService);

    const rendered = await service.mailer.renderTemplate("ejs-welcome", {
      user: { name: "Grace", role: "editor" },
    });

    expect(rendered.subject).toBe("Welcome Grace");
    expect(rendered.text).toContain("Role: editor");
    expect(rendered.html).toContain("<h1>Welcome Grace</h1>");
  });

  test("renders templates from Handlebars view files", async () => {
    registerMailerTransport({
      name: "default",
      defaults: {
        from: "noreply@xtaskjs.dev",
      },
      transport: {
        jsonTransport: true,
      },
    });
    registerHandlebarsTemplateRenderer({
      viewsDir: join(__dirname, "fixtures", "handlebars"),
      helpers: {
        upper: (value: string) => String(value || "").toUpperCase(),
      },
    });
    registerMailerTemplate({
      name: "handlebars-welcome",
      renderer: "handlebars-file",
      subject: "welcome.subject",
      text: "welcome.text",
      html: "welcome.html",
    });

    const container = new Container();
    await initializeMailerIntegration(container);

    @Service()
    class TemplateService {
      constructor(@InjectMailerService() public readonly mailer: MailerService) {}
    }

    container.register(TemplateService, { scope: "singleton" });
    const service = container.get(TemplateService);

    const rendered = await service.mailer.renderTemplate("handlebars-welcome", {
      user: { name: "Lin", role: "maintainer" },
    });

    expect(rendered.subject).toBe("Welcome LIN");
    expect(rendered.text).toContain("Role: maintainer");
    expect(rendered.html).toContain("<h1>Welcome LIN</h1>");
  });
});