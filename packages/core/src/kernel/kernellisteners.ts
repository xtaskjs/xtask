import "reflect-metadata";
import { OnEvent , ApplicationRunner,  CommandLineRunner } from "@xtaskjs/common";


// Clase que escucha eventos del ciclo de vida
export class KernelListeners {
  @OnEvent("starting")
  onStarting() {
    console.log("[Lifecycle] Starting...");
  }

  @OnEvent("ready")
  onReady() {
    console.log("[Lifecycle] Application ready!");
  }

  @ApplicationRunner(5)
  async afterStart() {
    console.log("[Runner] ApplicationRunner ejecutado después de arrancar Kernel");
  }

  @CommandLineRunner(0)
  async cli(args: string[]) {
    console.log("[Runner] CommandLineRunner con args:", args);
  }

  @OnEvent("memoryReport")
  memory(mem: NodeJS.MemoryUsage) {
    console.log("[Metrics] Heap MB:", (mem.heapUsed / 1024 / 1024).toFixed(2));
  }

  @OnEvent("cpuReport")
  cpu(calc: NodeJS.CpuUsage){
    console.log("CPU", (calc));
  }
}