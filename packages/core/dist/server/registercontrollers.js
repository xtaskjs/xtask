"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerControllerRoutes = registerControllerRoutes;
require("reflect-metadata");
const common_1 = require("@xtaskjs/common");
const buildFullPath = (controllerPath, routePath) => {
    const cPath = controllerPath || "";
    const rPath = routePath || "";
    const joined = `${cPath}${rPath}`.replace(/\/+/g, "/");
    if (!joined || joined === "/") {
        return "/";
    }
    return joined.startsWith("/") ? joined : `/${joined}`;
};
function registerControllerRoutes(instance, app) {
    const controllerMeta = (0, common_1.getControllerMetadata)(instance.constructor);
    if (!controllerMeta) {
        return;
    }
    const routes = (0, common_1.getRouteMetadata)(instance.constructor);
    for (const route of routes) {
        app.registerControllerRoute({
            method: route.method,
            path: buildFullPath(controllerMeta.path, route.path),
            controller: instance,
            handler: route.handler,
            middlewares: [...controllerMeta.middlewares, ...route.middlewares],
            guards: [...controllerMeta.guards, ...route.guards],
            pipes: [...controllerMeta.pipes, ...route.pipes],
            action: (...args) => instance[route.handler](...args),
        });
    }
}
