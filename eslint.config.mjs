// @ts-check
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript rules for all TS source files
  ...tseslint.configs.recommended,

  // Global config
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
      },
    },
  },

  // Override rules for the whole monorepo
  {
    files: ["packages/*/src/**/*.ts", "packages/*/test/**/*.ts"],
    rules: {
      // Allow any in framework/decorator code
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars: ignore underscore-prefixed params
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Decorators emit metadata — empty constructors are valid
      "@typescript-eslint/no-empty-function": "warn",
      // Allow require() for dynamic/conditional imports in CommonJS packages
      "@typescript-eslint/no-require-imports": "warn",
      // Legacy code often rethrows wrapped errors without `cause`
      "preserve-caught-error": "off",
      // Keep generic marker interfaces/types allowed in public API
      "@typescript-eslint/no-empty-object-type": "off",
      // Allow `Function` in extension points while the API is being typed
      "@typescript-eslint/no-unsafe-function-type": "off",
      // ANSI escape codes in logger regex are intentional
      "no-control-regex": "off",
    },
  },

  // Relax rules further in test files
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  // Ignore compiled output, samples, and config files
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "samples/**",
      "scripts/**",
      "**/*.js",
      "**/*.mjs",
    ],
  }
);
