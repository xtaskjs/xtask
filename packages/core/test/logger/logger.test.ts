import { Logger } from "@xtaskjs/common";

describe("Logger", ()=> {
    it ("Should print logs", () =>{
        const logger = new Logger();
        const spy = vi.spyOn(console, "log").mockImplementation();
        logger.info("hello");
        expect(spy).toHaveBeenCalledWith(expect.stringContaining("hello"));
        spy.mockRestore();
    })
})