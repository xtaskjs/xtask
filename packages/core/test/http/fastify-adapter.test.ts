import { FastifyAdapter } from "../../src/http/fastify-adapter";

describe("FastifyAdapter compatibility export", () => {
  it("should be exported from core compatibility shim", () => {
    expect(typeof FastifyAdapter).toBe("function");
  });
});
