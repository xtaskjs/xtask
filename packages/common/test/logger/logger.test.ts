import { Logger } from "../../src/logger/logger";

describe("Logger", () => {
  it("Should print logs", () => {
    const logger = new Logger();
    const spy = jest.spyOn(console, "log").mockImplementation();
    logger.info("hello");
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("hello"));
    spy.mockRestore();
  });
});