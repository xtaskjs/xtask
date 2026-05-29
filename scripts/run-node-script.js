#!/usr/bin/env node

const { spawnSync } = require("child_process");

const [scriptPath, ...scriptArgs] = process.argv.slice(2);

if (!scriptPath) {
  console.error("Usage: node ./scripts/run-node-script.js <script-path> [args...]");
  process.exit(1);
}

const result = spawnSync("node", [scriptPath, ...scriptArgs], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  throw result.error;
}

process.exit(typeof result.status === "number" ? result.status : 1);