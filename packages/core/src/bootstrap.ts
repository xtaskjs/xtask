import "reflect-metadata";
import { ApplicationLifeCycle } from "./server/application-lifecycle";
import { Kernel } from "./kernel/kernel";
import { KernelListeners } from "./kernel/kernellisteners";
import { registerEventHandlers } from "./server/registereventhandlers";

export async function Bootstrap(): Promise<Kernel> {
    const lifecycle = new ApplicationLifeCycle();
    const kernel = new Kernel();
    const listeners = new KernelListeners(); 
    registerEventHandlers(listeners, lifecycle);
    await lifecycle.boot(() => kernel.boot());
    return kernel;
}