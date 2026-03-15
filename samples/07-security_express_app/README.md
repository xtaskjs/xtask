# 07-security_express_app

Express sample application using `@xtaskjs/security` with JWT and JWE authentication.

It also registers `@xtaskjs/mailer` with two named transports: `default` for transactional mail and `notifications` for internal alerts. The sample profile emails are generated through registered mail templates backed by EJS view files in `views/mail`, and if `MAILTRAP_SMTP_USER` and `MAILTRAP_SMTP_PASS` are present, both channels switch to Mailtrap SMTP automatically.

## Run

```bash
npm install
npm start
```

From this folder: `samples/07-security_express_app`.

## Test URLs

- Anonymous health endpoint:
  - http://127.0.0.1:3000/health/
- Issue a JWT for the admin demo user:
  - http://127.0.0.1:3000/auth/jwt/admin
- Issue a JWT for the viewer demo user:
  - http://127.0.0.1:3000/auth/jwt/viewer
- Issue a JWE for the admin demo user:
  - http://127.0.0.1:3000/auth/jwe/admin
- JWT-protected profile route:
  - http://127.0.0.1:3000/me/
- JWT-protected admin route:
  - http://127.0.0.1:3000/admin/
- JWE-protected route:
  - http://127.0.0.1:3000/encrypted/
- Send a protected profile email:
  - `POST http://127.0.0.1:3000/me/notify`

The sample uses the global `ValidationPipe` enabled by `CreateApplication()`, so invalid request payloads now return HTTP `400` with validation details.

## Example Flow

1. Open `/auth/jwt/admin` and copy the returned token.
2. Call `/me/` with `Authorization: Bearer <token>`.
3. Call `/admin/` with the same token.
4. Open `/auth/jwe/admin` and call `/encrypted/` with the returned token.

Example with `curl`:

```bash
JWT_TOKEN=$(curl -s http://127.0.0.1:3000/auth/jwt/admin | node -e 'process.stdin.on("data", d => console.log(JSON.parse(d).token))')
curl -H "Authorization: Bearer $JWT_TOKEN" http://127.0.0.1:3000/me/
curl -H "Authorization: Bearer $JWT_TOKEN" http://127.0.0.1:3000/admin/
curl -X POST -H "Authorization: Bearer $JWT_TOKEN" -H "Content-Type: application/json" -d '{"to":"demo@example.com"}' http://127.0.0.1:3000/me/notify

# invalid email -> 400 validation error
curl -X POST -H "Authorization: Bearer $JWT_TOKEN" -H "Content-Type: application/json" -d '{"to":"not-an-email"}' http://127.0.0.1:3000/me/notify
```

## Notes

- This sample uses the `express` adapter through `@xtaskjs/express-http`.
- The sample uses strategy `validate` callbacks to enforce the `security-sample` tenant claim.
- User lookup is resolved from the XTaskJS DI container inside the validate callback.
- The JWE example uses compact `dir` + `A256GCM`, matching the current package support.
- By default, outgoing messages are rendered through Nodemailer's `jsonTransport` so the sample works without SMTP credentials.
- `/me/notify` renders `profile-summary` and `profile-notification` templates, sends the user-facing message through the `default` transport, and sends an internal alert through the `notifications` transport.
- The sample registers the `ejs-file` renderer and resolves template names against `views/mail/*.ejs`.