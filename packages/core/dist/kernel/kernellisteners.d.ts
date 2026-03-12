import "reflect-metadata";
export declare class KernelListeners {
    private readonly showMetricsLogs;
    private writeLog;
    onStarting(): void;
    onReady(): void;
    afterStart(): Promise<void>;
    cli(args: string[]): Promise<void>;
    memory(mem: NodeJS.MemoryUsage): void;
    cpu(calc: NodeJS.CpuUsage): void;
}
