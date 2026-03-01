# @xtaskjs/express-http

Express adapter package for xtaskjs HTTP applications.

## Installation
```bash
npm install @xtaskjs/express-http
```

## Usage
```typescript
import express from "express";
import { ExpressAdapter } from "@xtaskjs/express-http";
import { CreateApplication, view } from "@xtaskjs/core";

const expressApp = express();
const application = await CreateApplication({
  adapter: new ExpressAdapter(expressApp, {
    templateEngine: {
      render: async (template, model) => `<html><body><h1>${model.title}</h1></body></html>`,
    },
  }),
});

await application.listen({ port: 3000 });

// In a controller:
return view("home", { title: "Hello" });
```

## Native Express Engines (pug, hbs, ejs)

```typescript
import path from "path";
import { engine as hbsEngine } from "express-handlebars";

const adapter = new ExpressAdapter(expressApp, {
  templateEngine: {
    viewsPath: path.join(process.cwd(), "views"),
    extension: "hbs",
    engine: hbsEngine(),
    viewEngine: "hbs",
  },
});
```

You can also use the adapter shortcut in `@xtaskjs/core`:

```typescript
await CreateApplication({
  adapter: "express",
  adapterInstance: expressApp,
});
```
