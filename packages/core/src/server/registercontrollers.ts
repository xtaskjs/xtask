import "reflect-metadata";
import {
  ControllerMetadata,
  getControllerMetadata,
  getRouteMetadata,
  RouteMetadata,
} from "@xtaskjs/common";
import { ApplicationLifeCycle } from "./application-lifecycle";

const buildFullPath = (controllerPath: string, routePath: string): string => {
  const cPath = controllerPath || "";
  const rPath = routePath || "";
  const joined = `${cPath}${rPath}`.replace(/\/+/g, "/");
  if (!joined || joined === "/") {
    return "/";
  }
  return joined.startsWith("/") ? joined : `/${joined}`;
};

export function registerControllerRoutes(instance: any, app: ApplicationLifeCycle) {
  const controllerMeta: ControllerMetadata | undefined = getControllerMetadata(
    instance.constructor
  );
  if (!controllerMeta) {
    return;
  }

  const routes: RouteMetadata[] = getRouteMetadata(instance.constructor);
  for (const route of routes) {
    app.registerControllerRoute({
      method: route.method,
      path: buildFullPath(controllerMeta.path, route.path),
      controller: instance,
      handler: route.handler,
      middlewares: [...controllerMeta.middlewares, ...route.middlewares],
      guards: [...controllerMeta.guards, ...route.guards],
      pipes: [...controllerMeta.pipes, ...route.pipes],
      parameters: route.parameters,
      action: (...args: any[]) => instance[route.handler](...args),
    });
  }
}
