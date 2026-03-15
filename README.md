# xtaskjs Workspace

## Samples

- `01-new_app`: minimal `@xtaskjs/core` node-http application.
- `02-express_app`: Express adapter sample with static assets and file-backed views.
- `03-fastify_app`: Fastify adapter sample with views and static assets.
- `04-typeorm_app`: TypeORM integration sample.
- `06-security_app`: node-http security sample.
- `07-security_express_app`: Express security sample.
- `08-email_express_app`: Express mailer sample with file-backed email templates.
- `09-internationalization_app`: node-http internationalization sample with request-scoped locale resolution, custom formatters, and lazy namespaces.
- `10-internationalization_express_app`: Express internationalization sample with localized pages, views, and lazy checkout translations.

## Release helpers

Use the root scripts to pack or publish workspace packages in dependency order:

```bash
npm run release:order
npm run pack:packages
npm run publish:packages
```

Additional npm arguments can be passed through with `--`:

```bash
npm run pack:packages -- --dry-run
npm run publish:packages -- --tag next
```
