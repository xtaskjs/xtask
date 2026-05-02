export type ImportedModule = Record<string, unknown>;
export type ModuleImporter = (file: string) => Promise<ImportedModule>;

const defaultImporter: ModuleImporter = async (file) => {
    const loaded = await import(file);
    return loaded as ImportedModule;
};

export async function importFilesWithConcurrency(
    files: string[],
    concurrency = 10,
    importer: ModuleImporter = defaultImporter
): Promise<Map<string, ImportedModule>> {
    const results = new Map<string, ImportedModule>();
    const semaphore = new Semaphore(concurrency);

    await Promise.all(
        files.map(async (file) => {
            await semaphore.acquire();
            try {
                const module = await importer(file);
                results.set(file, module);
            } finally {
                semaphore.release();
            }
        })
    );

    return results;
}

class Semaphore {
    private queue: Array<() => void> = [];
    private running = 0;
    private readonly maxRunning: number;

    constructor(limit: number) {
        const normalized = Number.isFinite(limit) ? Math.floor(limit) : 1;
        this.maxRunning = Math.max(1, normalized);
    }

    acquire(): Promise<void> {
        return new Promise((resolve) => {
            if (this.running < this.maxRunning) {
                this.running += 1;
                resolve();
                return;
            }

            this.queue.push(() => {
                this.running += 1;
                resolve();
            });
        });
    }

    release(): void {
        this.running = Math.max(0, this.running - 1);
        const next = this.queue.shift();
        if (next) {
            next();
        }
    }
}