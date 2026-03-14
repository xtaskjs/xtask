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
    "^@xtaskjs/common$": "<rootDir>/../common/src/index.ts",
    "^@xtaskjs/common/(.*)$": "<rootDir>/../common/src/$1"
  },
};
