"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bootstrap = Bootstrap;
exports.CreateApplication = CreateApplication;
require("reflect-metadata");
const application_lifecycle_1 = require("./server/application-lifecycle");
const kernel_1 = require("./kernel/kernel");
const kernellisteners_1 = require("./kernel/kernellisteners");
const registereventhandlers_1 = require("./server/registereventhandlers");
const http_1 = require("./http");
async function Bootstrap() {
    const app = await CreateApplication();
    return app.getKernel();
}
async function CreateApplication(options = {}) {
    const lifecycle = new application_lifecycle_1.ApplicationLifeCycle();
    const kernel = new kernel_1.Kernel();
    const listeners = new kernellisteners_1.KernelListeners();
    (0, registereventhandlers_1.registerEventHandlers)(listeners, lifecycle);
    await lifecycle.boot(async () => {
        await kernel.boot();
        await (0, http_1.registerContainerInLifecycle)(kernel, lifecycle);
    });
    const adapter = (0, http_1.createHttpAdapter)(options.adapter, options.adapterInstance);
    const app = new http_1.XTaskHttpApplication({ adapter, lifecycle, kernel });
    if (options.autoListen) {
        await app.listen(options.server);
    }
    return app;
}
