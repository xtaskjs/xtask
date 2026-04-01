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
    "^@xtaskjs/common/(.*)$": "<rootDir>/../common/src/$1",
    "^@xtaskjs/core$": "<rootDir>/../core/src/index.ts",
    "^@xtaskjs/core/(.*)$": "<rootDir>/../core/src/$1",
    "^@xtaskjs/typeorm$": "<rootDir>/../typeorm/src/index.ts",
    "^@xtaskjs/typeorm/(.*)$": "<rootDir>/../typeorm/src/$1",
    "^@xtaskjs/queues$": "<rootDir>/../queues/src/index.ts",
    "^@xtaskjs/queues/(.*)$": "<rootDir>/../queues/src/$1"
  },
};