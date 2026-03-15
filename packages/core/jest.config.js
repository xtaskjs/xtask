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
    "^@xtaskjs/express-http$": "<rootDir>/../express-http/src/index.ts",
    "^@xtaskjs/express-http/(.*)$": "<rootDir>/../express-http/src/$1",
    "^@xtaskjs/fastify-http$": "<rootDir>/../fastify-http/src/index.ts",
    "^@xtaskjs/fastify-http/(.*)$": "<rootDir>/../fastify-http/src/$1",
    "^@xtaskjs/security$": "<rootDir>/../security/src/index.ts",
    "^@xtaskjs/security/(.*)$": "<rootDir>/../security/src/$1",
    "^@xtaskjs/mailer$": "<rootDir>/../mailer/src/index.ts",
    "^@xtaskjs/mailer/(.*)$": "<rootDir>/../mailer/src/$1",
    "^@xtaskjs/internationalization$": "<rootDir>/../internationalization/src/index.ts",
    "^@xtaskjs/internationalization/(.*)$": "<rootDir>/../internationalization/src/$1"
  },
};