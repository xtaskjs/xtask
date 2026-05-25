import { importFilesWithConcurrency } from "../../src/scanner/import-pool";

describe("importFilesWithConcurrency", () => {
    it("respects the configured concurrency limit", async () => {
        const files = Array.from({ length: 12 }, (_, index) => `file-${index}`);
        let active = 0;
        let maxActive = 0;

        const importer = async (file: string): Promise<Record<string, unknown>> => {
            active += 1;
            maxActive = Math.max(maxActive, active);

            await new Promise((resolve) => setTimeout(resolve, 20));

            active -= 1;
            return { default: file };
        };

        const loaded = await importFilesWithConcurrency(files, 3, importer);

        expect(loaded.size).toBe(files.length);
        expect(maxActive).toBeLessThanOrEqual(3);
        expect(loaded.get("file-0")?.default).toBe("file-0");
        expect(loaded.get("file-11")?.default).toBe("file-11");
    });

    it("normalizes invalid concurrency values to at least one", async () => {
        const files = ["a", "b", "c"];
        const importer = vi.fn(async (file: string) => ({ value: file }));

        const loaded = await importFilesWithConcurrency(files, 0, importer);

        expect(loaded.size).toBe(3);
        expect(importer).toHaveBeenCalledTimes(3);
        expect(loaded.get("a")?.value).toBe("a");
    });
});
