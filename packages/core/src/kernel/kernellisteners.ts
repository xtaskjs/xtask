import "reflect-metadata";
import { OnEvent , ApplicationRunner,  CommandLineRunner } from "@xtaskjs/common";


// Clase que escucha eventos del ciclo de vida
export class KernelListeners {
  private readonly showMetricsLogs = process.env.XTASKJS_SHOW_METRICS_LOGS === "true";

  private writeLog(...args: any[]) {
    if (process.env.NODE_ENV !== "test") {
      console.log(...args);
    }
  }

  @OnEvent("starting")
  onStarting() {
    this.writeLog("[Lifecycle] Starting...");
  }

  @OnEvent("ready")
  onReady() {
    this.writeLog("[Lifecycle] Application ready!");
  }

  @ApplicationRunner(5)
  async afterStart() {
    this.writeLog("[Runner] ApplicationRunner ejecutado después de arrancar Kernel");
  }

  @CommandLineRunner(0)
  async cli(args: string[]) {
    this.writeLog("[Runner] CommandLineRunner con args:", args);
  }

  @OnEvent("memoryReport")
  memory(mem: NodeJS.MemoryUsage) {
    if (!this.showMetricsLogs) {
      return;
    }
    this.writeLog("[Metrics] Heap MB:", (mem.heapUsed / 1024 / 1024).toFixed(2));
  }

  @OnEvent("cpuReport")
  cpu(calc: NodeJS.CpuUsage){
    if (!this.showMetricsLogs) {
      return;
    }
    this.writeLog("CPU", (calc));
  }
}