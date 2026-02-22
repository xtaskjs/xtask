import { OnEvent } from "@xtaskjs/common";
import { Service } from "../../src";

@Service()
class TestLifeCycleListener {
    public events: string []=[];

    @OnEvent('starting', 10)
    async onStarting(){
        this.events.push("starting");
    }
    
}

describe("ApplicationLifecycle decorators", () => {
    it("should execute lifecycle listener method", async () => {
        const listener = new TestLifeCycleListener();
        await listener.onStarting();
        expect(listener.events).toEqual(["starting"]);
    });
});