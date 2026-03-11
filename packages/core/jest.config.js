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
    "^@xtaskjs/express-http$": "<rootDir>/../express-http/src/index.ts",
    "^@xtaskjs/express-http/(.*)$": "<rootDir>/../express-http/src/$1",
    "^@xtaskjs/fastify-http$": "<rootDir>/../fastify-http/src/index.ts",
    "^@xtaskjs/fastify-http/(.*)$": "<rootDir>/../fastify-http/src/$1"
  },
};