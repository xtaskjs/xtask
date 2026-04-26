import { Controller, Get, Query, Req } from "@xtaskjs/common";
import { Throttle } from "@xtaskjs/throttler";
import { ThrottlerDemoService } from "./throttler-demo.service";

/**
 * Demonstrates three levels of throttling:
 *
 *  GET /api/public      - no throttle (open endpoint)
 *  GET /api/data        - inherits the global default (5 req / 10s per IP)
 *  GET /api/strict      - overridden per-method to 2 req / 10s per IP
 *  GET /api/admin       - custom key: throttled per ?user= query parameter
 *  GET /api/reset-limit - manually resets the caller's limit (for demo purposes)
 */
@Controller("/api")
export class ThrottlerController {
  constructor(private readonly demoService: ThrottlerDemoService) {}

  // ── No throttle applied ───────────────────────────────────────────────────

  @Get("/public")
  public() {
    return {
      message: "This endpoint is never rate-limited.",
      totalRequests: this.demoService.getTotalRequests(),
    };
  }

  // ── Inherits global default (5 req / 10s) ────────────────────────────────

  @Throttle(5, "10s")
  @Get("/data")
  data(@Req() req: any) {
    const ip = req?.ip || "unknown";
    return {
      ...this.demoService.recordRequest("data"),
      ip,
      note: "Throttled: 5 requests per 10 seconds per IP.",
    };
  }

  // ── Tighter per-method override (2 req / 10s) ────────────────────────────

  @Throttle(2, "10s")
  @Get("/strict")
  strict(@Req() req: any) {
    const ip = req?.ip || "unknown";
    return {
      ...this.demoService.recordRequest("strict"),
      ip,
      note: "Throttled: 2 requests per 10 seconds per IP.",
    };
  }

  // ── Custom key: throttle per query param ?user= ───────────────────────────

  @Throttle(3, "10s", {
    keyGenerator: ({ request }) => {
      const user = request?.query?.user;
      return typeof user === "string" && user.trim().length > 0
        ? `user:${user.trim()}`
        : request?.ip || "unknown";
    },
  })
  @Get("/admin")
  admin(@Query("user") user: string, @Req() req: any) {
    return {
      ...this.demoService.recordRequest("admin"),
      throttleKey: typeof user === "string" && user.trim().length > 0
        ? `user:${user}`
        : req?.ip || "unknown",
      note: "Throttled: 3 requests per 10 seconds per ?user= value.",
    };
  }

  // ── Manual limit reset (useful for testing) ───────────────────────────────

  @Get("/reset-limit")
  async resetLimit(@Req() req: any) {
    const ip = req?.ip || "unknown";
    await this.demoService.resetLimitForIp(ip);
    return {
      message: `Rate limit cleared for IP: ${ip}`,
    };
  }
}
