export interface RunnerMeta {
  type: "ApplicationRunner" | "CommandLineRunner";
  method: string | symbol;
  priority: number;
}