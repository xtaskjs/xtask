#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const pkgArg = process.argv[2] ?? ".";

const directPath = path.resolve(process.cwd(), pkgArg);
const workspacePath = path.resolve(process.cwd(), "../..", pkgArg);
const packageDir = existsSync(path.join(directPath, "package.json"))
  ? directPath
  : workspacePath;
const packageJsonPath = path.join(packageDir, "package.json");
if (!existsSync(packageJsonPath)) {
  console.error(`package.json not found for path: ${pkgArg}`);
  process.exit(1);
}
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

const entry = "index.js";
const distDir = path.join(packageDir, "dist");
const cjsDir = path.join(distDir, "cjs");
const esmDir = path.join(distDir, "esm");

await mkdir(cjsDir, { recursive: true });
await mkdir(esmDir, { recursive: true });

await writeFile(
  path.join(cjsDir, "package.json"),
  JSON.stringify({ type: "commonjs" }, null, 2) + "\n",
  "utf8"
);

await writeFile(
  path.join(esmDir, "package.json"),
  JSON.stringify({ type: "module" }, null, 2) + "\n",
  "utf8"
);

const esmWrapper = [
  `import cjs from "../cjs/${entry}";`,
  `export * from "../cjs/${entry}";`,
  "export default cjs;",
  "",
].join("\n");

await writeFile(path.join(esmDir, entry), esmWrapper, "utf8");

const dtsSource = path.join(cjsDir, "index.d.ts");
const dtsTarget = path.join(esmDir, "index.d.ts");
try {
  const dtsContent = await readFile(dtsSource, "utf8");
  await writeFile(dtsTarget, dtsContent, "utf8");
} catch {
  // Some packages may not emit declarations in specific scenarios.
}

console.log(`Dual package artifacts generated for ${packageJson.name}`);