export const SAMPLE_TENANT = "bots-webhook-sample";
export const SAMPLE_JWT_SECRET = process.env.JWT_SECRET || "xtask-bots-webhook-security-secret";
export const SLACK_WEBHOOK_SECRET =
  process.env.SLACK_WEBHOOK_SECRET || "xtask-bots-webhook-slack-signing-secret";
export const TELEGRAM_WEBHOOK_SECRET =
  process.env.TELEGRAM_WEBHOOK_SECRET || "xtask-bots-webhook-telegram-signing-secret";
