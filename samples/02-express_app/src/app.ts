import express from "express";
import { CreateApplication } from "@xtaskjs/core";
import { ExpressAdapter } from "@xtaskjs/express-http";

async function main() {
  const expressApp = express();
  expressApp.use(express.json());

  await CreateApplication({
    adapter: new ExpressAdapter(expressApp, {
      templateEngine: {
        render: async (template, model) => {
          if (template === "home") {
            return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${model.title || "xTaskJS"}</title>
    <style>
      :root { color-scheme: light dark; }
      body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .page { min-height: 100vh; display: grid; place-items: center; background: #0f172a; color: #e2e8f0; }
      .card { max-width: 640px; padding: 2rem; border-radius: 16px; background: #111827; box-shadow: 0 10px 30px rgba(0,0,0,.25); }
      h1 { margin-top: 0; }
      .muted { opacity: .75; }
      button { margin-top: 1rem; padding: .6rem 1rem; border: 0; border-radius: 8px; cursor: pointer; }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="card">
        <h1>${model.title || "xTaskJS Express App"}</h1>
        <p class="muted">Template rendered by a custom engine function in <code>ExpressAdapter</code>.</p>
        <button id="ping">Ping</button>
        <pre id="out"></pre>
      </section>
    </main>
    <script>
      document.getElementById("ping").addEventListener("click", async () => {
        const res = await fetch("/health");
        const body = await res.json();
        document.getElementById("out").textContent = JSON.stringify(body, null, 2);
      });
    </script>
  </body>
</html>`;
          }
          return `<html><body><h1>Template '${template}' not found</h1></body></html>`;
        },
      },
    }),
    autoListen: true,
    server: {
      host: "127.0.0.1",
      port: Number(process.env.PORT || 3000),
    },
  });
}

main().catch((error) => {
  console.error("Error starting the application:", error);
});
