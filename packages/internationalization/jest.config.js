/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.test.json",
      },
    ],
  },
  moduleNameMapper: {
    "^@xtaskjs/core$": "<rootDir>/../core/src/index.ts",
    "^@xtaskjs/core/(.*)$": "<rootDir>/../core/src/$1",
  },
};