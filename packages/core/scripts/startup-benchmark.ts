import "reflect-metadata";
import { performance } from "perf_hooks";
import { CreateApplication } from "../src/bootstrap";

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
};

const average = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((sum, current) => sum + current, 0);
  return total / values.length;
};

const runOnce = async (): Promise<number> => {
  const startedAt = performance.now();
  const app = await CreateApplication({ autoListen: false });
  const endedAt = performance.now();

  await app.getLifecycle().stop();
  await app.close();

  return endedAt - startedAt;
};

async function main() {
  const iterations = toNumber(process.env.XTASKJS_BENCH_ITERATIONS, 10);
  const warmup = toNumber(process.env.XTASKJS_BENCH_WARMUP, 3);
  const benchmarkNodeEnv = process.env.XTASKJS_BENCH_NODE_ENV || "test";

  process.env.NODE_ENV = benchmarkNodeEnv;
  process.env.XTASKJS_SHOW_METRICS_LOGS = "false";

  console.log(`[benchmark] startup | warmup=${warmup} | iterations=${iterations} | nodeEnv=${benchmarkNodeEnv}`);

  for (let index = 0; index < warmup; index += 1) {
    await runOnce();
  }

  const samples: number[] = [];
  for (let index = 0; index < iterations; index += 1) {
    if (typeof global.gc === "function") {
      global.gc();
    }
    const elapsed = await runOnce();
    samples.push(elapsed);
  }

  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const mean = average(samples);
  const p50 = percentile(samples, 50);
  const p95 = percentile(samples, 95);

  console.log(`[benchmark] mean=${mean.toFixed(2)}ms p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms min=${min.toFixed(2)}ms max=${max.toFixed(2)}ms`);
  console.log(`[benchmark] samples=${samples.map((value) => value.toFixed(2)).join(",")}`);
}

main().catch((error) => {
  console.error("[benchmark] failed", error);
  process.exitCode = 1;
});
