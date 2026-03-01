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
import { createApplication } from "@xtaskjs/core";

const app = express();
const application = await createApplication({
  adapter: new ExpressAdapter(app),
});

await application.listen({ port: 3000 });
```

You can also use the adapter shortcut in `@xtaskjs/core`:

```typescript
await createApplication({
  adapter: "express",
  adapterInstance: app,
});
```
