#!/usr/bin/env node

const { spawnSync } = require("child_process");

const cliArgs = process.argv.slice(2);
const taskName = cliArgs[0] && !cliArgs[0].startsWith("-") ? cliArgs.shift() : "test";

const isTestTask = taskName === "test" || taskName.startsWith("test:");
const hasForceFlag = cliArgs.includes("--force");
const skipForce = process.env.XTASK_TURBO_TEST_NO_FORCE === "1";

if (isTestTask && !hasForceFlag && !skipForce) {
  cliArgs.push("--force");
}

const args = ["turbo", "run", taskName, ...cliArgs];

const result = spawnSync("pnpm", args, {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    XTASK_SKIP_SAMPLE_PRETEST_BUILDS: "1",
  },
});

if (result.error) {
  throw result.error;
}

process.exit(typeof result.status === "number" ? result.status : 1);