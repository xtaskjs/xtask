#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const workspaceRoot = path.resolve(__dirname, "..");
const samplesRoot = path.join(workspaceRoot, "samples");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getSampleDirectories() {
  return fs
    .readdirSync(samplesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(samplesRoot, entry.name))
    .filter((dirPath) => fs.existsSync(path.join(dirPath, "package.json")))
    .sort((left, right) => left.localeCompare(right));
}

function runSampleTests(sampleDir) {
  const manifest = readJson(path.join(sampleDir, "package.json"));
  if (!manifest.scripts || typeof manifest.scripts.test !== "string") {
    console.log(`Skipping ${path.basename(sampleDir)} (no test script)`);
    return;
  }

  console.log(`\n==> pnpm test ${manifest.name || path.basename(sampleDir)}`);

  const result = spawnSync("pnpm", ["test"], {
    cwd: sampleDir,
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

function main() {
  const sampleDirectories = getSampleDirectories();
  for (const sampleDir of sampleDirectories) {
    runSampleTests(sampleDir);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
