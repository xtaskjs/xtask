import "reflect-metadata";
import { ApplicationLifeCycle, Kernel, KernelListeners, registerEventHandlers } from "@xtaskjs/core";

export async function Bootstrap(): Promise<Kernel> {
    const lifecycle = new ApplicationLifeCycle();
    const kernel = new Kernel();
    const listeners = new KernelListeners(); 
    registerEventHandlers(listeners, lifecycle);
    await lifecycle.boot(() => kernel.boot());
    return kernel;
}