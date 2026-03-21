#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const workspaceRoot = path.resolve(__dirname, "..");
const packagesRoot = path.join(workspaceRoot, "packages");
const xtaskScope = "@xtaskjs/";
const supportedCommands = new Set(["list", "pack", "publish", "version"]);
const supportedVersionBumps = new Set(["patch", "minor", "major"]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
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
  const [command = "list", ...restArgs] = argv;

  if (!supportedCommands.has(command)) {
    throw new Error(
      `Unsupported command '${command}'. Use one of: ${Array.from(supportedCommands).join(", ")}`
    );
  }

  let bump;
  const extraArgs = [];

  for (let index = 0; index < restArgs.length; index += 1) {
    const arg = restArgs[index];
    if (arg === "--bump") {
      bump = restArgs[index + 1];
      index += 1;

      if (!bump) {
        throw new Error("Missing value for --bump. Use one of: patch, minor, major, or an explicit semver version.");
      }

      continue;
    }

    extraArgs.push(arg);
  }

  if (command === "version") {
    const versionTarget = bump || extraArgs.shift();
    if (!versionTarget) {
      throw new Error("Version command requires a bump target. Example: node ./scripts/release-packages.js version patch");
    }

    return { command, extraArgs: [], bump: versionTarget };
  }

  return { command, extraArgs, bump };
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

function parseSemver(version) {
  const match = String(version || "").trim().match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if (!match) {
    throw new Error(`Unsupported semver version '${version}'`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function resolveNextVersion(currentVersion, bump) {
  const normalizedBump = String(bump || "").trim();
  if (!normalizedBump) {
    throw new Error("Version bump target cannot be empty");
  }

  if (!supportedVersionBumps.has(normalizedBump)) {
    parseSemver(normalizedBump);
    return normalizedBump;
  }

  const parsedVersion = parseSemver(currentVersion);
  if (normalizedBump === "major") {
    return `${parsedVersion.major + 1}.0.0`;
  }

  if (normalizedBump === "minor") {
    return `${parsedVersion.major}.${parsedVersion.minor + 1}.0`;
  }

  return `${parsedVersion.major}.${parsedVersion.minor}.${parsedVersion.patch + 1}`;
}

function updateDependencySpec(currentValue, nextVersion) {
  const rawValue = String(currentValue || "").trim();
  const prefixedSemver = rawValue.match(/^([~^])(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)$/);
  if (prefixedSemver) {
    return `${prefixedSemver[1]}${nextVersion}`;
  }

  const plainSemver = rawValue.match(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/);
  if (plainSemver) {
    return nextVersion;
  }

  return rawValue;
}

function updateInternalDependencyVersions(manifest, nextVersionByPackage) {
  const dependencySections = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ];

  for (const sectionName of dependencySections) {
    const section = manifest[sectionName];
    if (!section || typeof section !== "object") {
      continue;
    }

    for (const dependencyName of Object.keys(section)) {
      if (!nextVersionByPackage.has(dependencyName)) {
        continue;
      }

      section[dependencyName] = updateDependencySpec(
        section[dependencyName],
        nextVersionByPackage.get(dependencyName)
      );
    }
  }
}

function bumpPackageVersions(packages, bump) {
  const nextVersionByPackage = new Map();
  for (const pkg of packages) {
    nextVersionByPackage.set(pkg.name, resolveNextVersion(pkg.manifest.version, bump));
  }

  console.log(`\nApplying version bump: ${bump}`);

  for (const pkg of packages) {
    const nextVersion = nextVersionByPackage.get(pkg.name);
    const previousVersion = pkg.manifest.version;
    pkg.manifest.version = nextVersion;
    updateInternalDependencyVersions(pkg.manifest, nextVersionByPackage);
    writeJson(pkg.manifestPath, pkg.manifest);
    console.log(`- ${pkg.name}: ${previousVersion} -> ${nextVersion}`);
  }
}

function main() {
  const { command, extraArgs, bump } = parseArguments(process.argv.slice(2));
  const packages = sortPackages(collectWorkspacePackages());

  printOrder(packages);

  if (command === "list") {
    return;
  }

  if (command === "version") {
    bumpPackageVersions(packages, bump);
    return;
  }

  if (command === "publish" && bump) {
    bumpPackageVersions(packages, bump);
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