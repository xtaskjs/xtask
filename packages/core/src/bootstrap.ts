import "reflect-metadata";
import { ApplicationLifeCycle } from "./server/application-lifecycle";
import { Kernel } from "./kernel/kernel";
import { KernelListeners } from "./kernel/kernellisteners";
import { registerEventHandlers } from "./server/registereventhandlers";
import {
    createGlobalValidationPipe,
    createHttpAdapter,
    registerContainerInLifecycle,
    XTaskHttpApplication,
} from "./http";
import type { CreateApplicationOptions } from "./http";

export async function Bootstrap(): Promise<Kernel> {
    const app = await CreateApplication();
    return app.getKernel();
}

export async function CreateApplication(
    options: CreateApplicationOptions = {}
): Promise<XTaskHttpApplication> {
    const lifecycle = new ApplicationLifeCycle();
    lifecycle.useGlobalPipes(createGlobalValidationPipe());
    const containerOptions = options.logger
        ? {
            ...(options.container || {}),
            logger: options.logger,
        }
        : options.container;
    const kernel = new Kernel({
        containerOptions,
        prebuiltManifest: options.prebuiltManifest,
        hotManifestWatcher: options.hotManifestWatcher,
    });
    const listeners = new KernelListeners();
    registerEventHandlers(listeners, lifecycle);

    await lifecycle.boot(async () => {
        await kernel.boot(lifecycle);
        await registerContainerInLifecycle(kernel, lifecycle);
    });

    const adapter = createHttpAdapter(options.adapter, options.adapterInstance);
    const app = new XTaskHttpApplication({ adapter, lifecycle, kernel });

    if (options.autoListen) {
        await app.listen(options.server);
    }

    return app;
}