import { createHmac, timingSafeEqual } from "crypto";
import { Service } from "@xtaskjs/core";
import { SLACK_WEBHOOK_SECRET, TELEGRAM_WEBHOOK_SECRET } from "./security.config";

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, "utf-8");
  const rightBuffer = Buffer.from(right, "utf-8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

@Service()
export class WebhookSignatureService {
  createSlackSignature(timestamp: string, rawBody: string): string {
    const baseString = `v0:${timestamp}:${rawBody}`;
    const digest = createHmac("sha256", SLACK_WEBHOOK_SECRET)
      .update(baseString, "utf-8")
      .digest("hex");
    return `v0=${digest}`;
  }

  verifySlackSignature(timestamp: string, providedSignature: string, rawBody: string): boolean {
    if (!timestamp || !providedSignature) {
      return false;
    }

    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds)) {
      return false;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const maxAgeSeconds = 5 * 60;
    if (Math.abs(nowSeconds - timestampSeconds) > maxAgeSeconds) {
      return false;
    }

    const expectedSignature = this.createSlackSignature(timestamp, rawBody);
    return safeEqual(expectedSignature, providedSignature);
  }

  createTelegramSignature(rawBody: string): string {
    return createHmac("sha256", TELEGRAM_WEBHOOK_SECRET)
      .update(rawBody, "utf-8")
      .digest("hex");
  }

  verifyTelegramSignature(providedSignature: string, rawBody: string): boolean {
    if (!providedSignature) {
      return false;
    }

    const expectedSignature = this.createTelegramSignature(rawBody);
    return safeEqual(expectedSignature, providedSignature);
  }
}
