# @xtaskjs/fastify-http

Fastify adapter package for xtaskjs HTTP applications.

This package is part of the xtaskjs project, hosted at [xtaskjs.io](https://xtaskjs.io).

## Installation
```bash
npm install @xtaskjs/fastify-http
```

## Usage
```typescript
import fastify from "fastify";
import { CreateApplication, view } from "@xtaskjs/core";
import { FastifyAdapter } from "@xtaskjs/fastify-http";

const fastifyApp = fastify();
const app = await CreateApplication({
  adapter: new FastifyAdapter(fastifyApp),
});

await app.listen({ port: 3000 });

// In a controller:
return view("home", { title: "Hello" });
```

By default, `FastifyAdapter` uses:

- `views/` as templates directory
- `public/` as static assets directory (`/app.css`, `/images/logo.png`, etc.)
- `.html` as the template extension for filesystem templates

## Custom Views/Public Paths

```typescript
import path from "path";

const adapter = new FastifyAdapter(fastifyApp, {
  templateEngine: {
    viewsPath: path.join(process.cwd(), "resources/views"),
    fileExtension: ".html",
  },
  staticFiles: {
    publicPath: path.join(process.cwd(), "resources/public"),
    urlPrefix: "/",
  },
});
```

You can also use the adapter shortcut in `@xtaskjs/core`:

```typescript
await CreateApplication({
  adapter: "fastify",
  adapterInstance: fastifyApp,
});
```

## Resources
- Project site and documentation: [xtaskjs.io](https://xtaskjs.io)
- npm package: [@xtaskjs/express-http](https://www.npmjs.com/package/@xtaskjs/fastify-http)
- Source repository: [xtaskjs/xtaskjs](https://github.com/xtaskjs/xtaskjs)