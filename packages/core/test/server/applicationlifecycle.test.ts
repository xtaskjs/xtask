import { OnEvent } from "@xtaskjs/common";
import { Service } from "packages/core/src";

@Service()
class TestLifeCycleListener {
    public events: string []=[];

    @OnEvent('starting', 10)
    async onStarting(){
        this.events.push("starting");
    }
    
}