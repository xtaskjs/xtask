import { Logger } from "@xtaskjs/common";
import { Service } from "@xtaskjs/core";
import {
  InjectThrottlerService,
  ThrottlerService,
} from "@xtaskjs/throttler";

/**
 * A simple in-memory counter that simulates a data source hit.
 * Every request to the "data" endpoint increments the counter.
 */
@Service()
export class ThrottlerDemoService {
  private requestCount = 0;

  constructor(
    private readonly logger: Logger,
    @InjectThrottlerService()
    private readonly throttler: ThrottlerService
  ) {}

  recordRequest(label: string): { label: string; totalRequests: number } {
    this.requestCount += 1;
    this.logger.info(`Request recorded: ${label} (total: ${this.requestCount})`);
    return { label, totalRequests: this.requestCount };
  }

  getTotalRequests(): number {
    return this.requestCount;
  }

  async resetLimitForIp(ip: string): Promise<void> {
    await this.throttler.reset(ip);
    this.logger.info(`Rate limit manually reset for IP: ${ip}`);
  }
}
