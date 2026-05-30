import type { ConfigValidationErrorOptions, ConfigValidationIssue } from "./types";

const resolveIssuePath = (path: Array<string | number>): string => {
  if (!path.length) {
    return "$";
  }

  return path.map((segment) => String(segment)).join(".");
};

const resolveIssueKey = (path: Array<string | number>): string => {
  const head = path[0];
  return typeof head === "string" ? head : "$";
};

const toValidationIssue = (
  issue: ConfigValidationErrorOptions["issues"][number],
  keyMap: Record<string, string>
): ConfigValidationIssue => {
  const key = resolveIssueKey(issue.path);
  return {
    key,
    envKey: keyMap[key] || key,
    path: resolveIssuePath(issue.path),
    message: issue.message,
    code: issue.code,
  };
};

const formatIssues = (issues: ConfigValidationIssue[]): string => {
  return issues
    .map((issue) => `- ${issue.envKey}: ${issue.message} (${issue.code})`)
    .join("\n");
};

export class ConfigValidationError extends Error {
  readonly issues: ConfigValidationIssue[];

  constructor(options: ConfigValidationErrorOptions) {
    const issues = options.issues.map((issue) => toValidationIssue(issue, options.keyMap));
    const message = [
      "Configuration validation failed.",
      formatIssues(issues),
    ].join("\n");

    super(message);
    this.name = "ConfigValidationError";
    this.issues = issues;
  }
}
