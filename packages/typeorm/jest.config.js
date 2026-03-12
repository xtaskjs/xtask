const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    "^@xtaskjs/common$": "<rootDir>/../common/src/index.ts",
    "^@xtaskjs/common/(.*)$": "<rootDir>/../common/src/$1",
    "^@xtaskjs/core$": "<rootDir>/../core/src/index.ts",
    "^@xtaskjs/core/(.*)$": "<rootDir>/../core/src/$1"
  },
};
