import "reflect-metadata";
import assert from "assert";
import { createSampleRuntime } from "./runtime";

async function main() {
  const runtime = await createSampleRuntime();

  try {
    const servers = runtime.mcp.listServers();
    assert.strictEqual(servers.length, 1);
    assert.strictEqual(servers[0].name, "xtask-sample");

    const methods = runtime.mcp.listMethods("xtask-sample");
    assert.ok(methods.some((method) => method.kind === "tool" && method.name === "echo"));
    assert.ok(methods.some((method) => method.kind === "tool" && method.name === "sum"));
    assert.ok(methods.some((method) => method.kind === "prompt" && method.name === "status"));
    assert.ok(
      methods.some(
        (method) => method.kind === "resource" && method.uriTemplate === "resource://xtask/status"
      )
    );

    const echo = await runtime.mcp.executeTool("xtask-sample", "echo", { hello: "world" });
    assert.ok(typeof echo === "object");

    const sum = (await runtime.mcp.executeTool("xtask-sample", "sum", {
      values: [2, 3, 5],
    })) as any;
    assert.strictEqual(sum.total, 10);
    assert.strictEqual(sum.count, 3);

    const prompt = await runtime.mcp.renderPrompt("xtask-sample", "status", {
      audience: "maintainer",
    });
    assert.strictEqual(typeof prompt, "string");

    const resource = (await runtime.mcp.readResource(
      "xtask-sample",
      "resource://xtask/status"
    )) as any;
    assert.strictEqual(resource.healthy, true);

    console.log("All tests passed!");
  } finally {
    await runtime.app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
