const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    "^@xtaskjs/common$": "<rootDir>/../common/dist/index.js",
    "^@xtaskjs/common/(.*)$": "<rootDir>/../common/dist/$1"
  },
};