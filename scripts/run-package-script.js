#!/usr/bin/env node

const { spawnSync } = require("child_process");

const [packageDir, scriptName, ...scriptArgs] = process.argv.slice(2);

if (!packageDir || !scriptName) {
  console.error("Usage: node ./scripts/run-package-script.js <package-dir> <script> [args...]");
  process.exit(1);
}

const result = spawnSync("pnpm", ["-C", packageDir, scriptName, ...scriptArgs], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  throw result.error;
}

process.exit(typeof result.status === "number" ? result.status : 1);