import "reflect-metadata";
import { ValidationPipe } from "@xtaskjs/common";
import { ApplicationLifeCycle } from "./server/application-lifecycle";
import { Kernel } from "./kernel/kernel";
import { KernelListeners } from "./kernel/kernellisteners";
import { registerEventHandlers } from "./server/registereventhandlers";
import {
    createHttpAdapter,
    CreateApplicationOptions,
    registerContainerInLifecycle,
    XTaskHttpApplication,
} from "./http";

export async function Bootstrap(): Promise<Kernel> {
    const app = await CreateApplication();
    return app.getKernel();
}

export async function CreateApplication(
    options: CreateApplicationOptions = {}
): Promise<XTaskHttpApplication> {
    const lifecycle = new ApplicationLifeCycle();
    lifecycle.useGlobalPipes(new ValidationPipe());
    const kernel = new Kernel();
    const listeners = new KernelListeners();
    registerEventHandlers(listeners, lifecycle);

    await lifecycle.boot(async () => {
        await kernel.boot();
        await registerContainerInLifecycle(kernel, lifecycle);
    });

    const adapter = createHttpAdapter(options.adapter, options.adapterInstance);
    const app = new XTaskHttpApplication({ adapter, lifecycle, kernel });

    if (options.autoListen) {
        await app.listen(options.server);
    }

    return app;
}