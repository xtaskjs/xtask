# 08-email_express_app

Express sample application using `@xtaskjs/mailer` to send emails with EJS file templates.

## Run

```bash
npm install
npm start
```

From this folder: `samples/08-email_express_app`.

The sample loads `.env` automatically on startup. A ready-to-edit `.env` file is included, and `.env.example` is kept as the template.

## What It Shows

- `@xtaskjs/mailer` integrated into an Express app created with `@xtaskjs/core`.
- A default transactional transport plus a named `notifications` transport.
- `registerEjsTemplateRenderer()` resolving templates from `views/mail/*.ejs`.
- `MailerService.sendTemplate()` used by a DI-managed service.

## Endpoints

- Health check:
  - `GET http://127.0.0.1:3000/health/`
- Send a welcome email:
  - `POST http://127.0.0.1:3000/email/welcome`
- Send a campaign email:
  - `POST http://127.0.0.1:3000/email/campaign`

## Example Requests

```bash
curl http://127.0.0.1:3000/health/

curl -X POST http://127.0.0.1:3000/email/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ada@example.com",
    "name": "Ada",
    "product": "xTaskJS Mailer"
  }'

curl -X POST http://127.0.0.1:3000/email/campaign \
  -H "Content-Type: application/json" \
  -d '{
    "to": "grace@example.com",
    "name": "Grace",
    "campaign": "Spring Launch",
    "ctaUrl": "https://xtaskjs.com/docs"
  }'
```

## Notes

- Without SMTP credentials, the sample uses Nodemailer's `jsonTransport`, so the response includes a message preview instead of delivering over SMTP.
- If `MAILTRAP_SMTP_USER` and `MAILTRAP_SMTP_PASS` are set, both transports use Mailtrap SMTP.
- Templates are file-backed EJS views in `views/mail`.
- Copy `.env.example` to `.env` and replace the Mailtrap placeholders with your SMTP sandbox credentials.