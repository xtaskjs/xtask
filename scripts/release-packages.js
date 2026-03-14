#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const workspaceRoot = path.resolve(__dirname, "..");
const packagesRoot = path.join(workspaceRoot, "packages");
const xtaskScope = "@xtaskjs/";
const supportedCommands = new Set(["list", "pack", "publish"]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getPackageDirectories() {
  return fs
    .readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packagesRoot, entry.name))
    .filter((dirPath) => fs.existsSync(path.join(dirPath, "package.json")));
}

function collectWorkspacePackages() {
  const packageDirectories = getPackageDirectories();
  const packages = packageDirectories
    .map((dirPath) => {
      const manifestPath = path.join(dirPath, "package.json");
      const manifest = readJson(manifestPath);
      return {
        dirPath,
        manifestPath,
        manifest,
        name: manifest.name,
      };
    })
    .filter((pkg) => typeof pkg.name === "string" && pkg.name.startsWith(xtaskScope));

  const packageNames = new Set(packages.map((pkg) => pkg.name));

  for (const pkg of packages) {
    const dependencies = {
      ...(pkg.manifest.dependencies || {}),
      ...(pkg.manifest.optionalDependencies || {}),
    };

    pkg.internalDependencies = Object.keys(dependencies)
      .filter((dependencyName) => packageNames.has(dependencyName))
      .sort();
  }

  return packages.sort((left, right) => left.name.localeCompare(right.name));
}

function sortPackages(packages) {
  const packageByName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  const visited = new Set();
  const active = new Set();
  const sorted = [];

  function visit(packageName, trail = []) {
    if (visited.has(packageName)) {
      return;
    }

    if (active.has(packageName)) {
      throw new Error(`Circular internal dependency detected: ${[...trail, packageName].join(" -> ")}`);
    }

    const pkg = packageByName.get(packageName);
    if (!pkg) {
      throw new Error(`Unknown workspace package: ${packageName}`);
    }

    active.add(packageName);

    for (const dependencyName of pkg.internalDependencies) {
      visit(dependencyName, [...trail, packageName]);
    }

    active.delete(packageName);
    visited.add(packageName);
    sorted.push(pkg);
  }

  for (const pkg of packages) {
    visit(pkg.name);
  }

  return sorted;
}

function parseArguments(argv) {
  const [command = "list", ...extraArgs] = argv;

  if (!supportedCommands.has(command)) {
    throw new Error(
      `Unsupported command '${command}'. Use one of: ${Array.from(supportedCommands).join(", ")}`
    );
  }

  return { command, extraArgs };
}

function printOrder(packages) {
  console.log("xtaskjs workspace package order:");
  packages.forEach((pkg, index) => {
    const dependencies = pkg.internalDependencies.length
      ? ` <- ${pkg.internalDependencies.join(", ")}`
      : "";
    console.log(`${index + 1}. ${pkg.name}${dependencies}`);
  });
}

function runNpmCommand(command, pkg, extraArgs) {
  const args = [command, ...extraArgs];
  const result = spawnSync("npm", args, {
    cwd: pkg.dirPath,
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
  const { command, extraArgs } = parseArguments(process.argv.slice(2));
  const packages = sortPackages(collectWorkspacePackages());

  printOrder(packages);

  if (command === "list") {
    return;
  }

  for (const pkg of packages) {
    console.log(`\n==> npm ${command} ${pkg.name}`);
    runNpmCommand(command, pkg, extraArgs);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}