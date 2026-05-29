#!/usr/bin/env node

const { spawnSync } = require("child_process");

const cliArgs = process.argv.slice(2);
const taskName = cliArgs[0] && !cliArgs[0].startsWith("-") ? cliArgs.shift() : "test";
const args = ["turbo", "run", taskName, ...cliArgs];

const result = spawnSync("pnpm", args, {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  throw result.error;
}

process.exit(typeof result.status === "number" ? result.status : 1);