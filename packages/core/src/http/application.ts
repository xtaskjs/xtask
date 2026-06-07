import { ValidationPipe } from "@xtaskjs/common";
import type { HttpMethod } from "@xtaskjs/common";
import type { LoggerOptions } from "@xtaskjs/common";
import { createRequire } from "module";
import { join } from "path";
import { clearCurrentContainer, setCurrentContainer } from "../di";
import type { Container, ContainerOptions } from "../di";
import type { Kernel } from "../kernel";
import type { ApplicationLifeCycle } from "../server";
import { HttpError } from "./errors";
import { NodeHttpAdapter } from "./node-http-adapter";
import type {
  HttpAdapter,
  HttpAdapterType,
  HttpRequestLike,
  HttpResponseLike,
  HttpServerOptions,
  HttpViewResult,
} from "./types";

export interface CreateApplicationOptions {
  adapter?: HttpAdapter | HttpAdapterType;
  adapterInstance?: any;
  server?: HttpServerOptions;
  autoListen?: boolean;
  container?: ContainerOptions;
  logger?: LoggerOptions;
  prebuiltManifest?: {
    enabled?: boolean;
  };
  hotManifestWatcher?: {
    enabled?: boolean;
    debounceMs?: number;
  };
}

const defaultServerOptions: Required<HttpServerOptions> = {
  host: "127.0.0.1",
  port: 3000,
};

const getApplicationRequire = (): NodeRequire | undefined => {
  try {
    return createRequire(join(process.cwd(), "package.json"));
  } catch {
    return undefined;
  }
};

const isPackageDeclaredInApplication = (moduleName: string): boolean => {
  if (process.env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID)) {
    return true;
  }

  const applicationRequire = getApplicationRequire();
  if (!applicationRequire) {
    return false;
  }

  try {
    const applicationPackage = applicationRequire("./package.json") as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };

    return [
      applicationPackage.dependencies,
      applicationPackage.devDependencies,
      applicationPackage.peerDependencies,
      applicationPackage.optionalDependencies,
    ].some((dependencyMap) => Boolean(dependencyMap?.[moduleName]));
  } catch {
    return false;
  }
};

const requireFromApplication = <T = any>(moduleName: string): T => {
  try {
    return require(moduleName) as T;
  } catch (error: any) {
    const isMissingCurrentModule =
      error?.code === "MODULE_NOT_FOUND" &&
      String(error?.message || "").includes(`'${moduleName}'`);

    if (!isMissingCurrentModule) {
      throw error;
    }

    const applicationRequire = getApplicationRequire();
    if (!applicationRequire) {
      throw error;
    }

    return applicationRequire(moduleName) as T;
  }
};

const normalizeServerOptions = (
  options: HttpServerOptions | undefined
): Required<HttpServerOptions> => ({
  host: options?.host || defaultServerOptions.host,
  port: options?.port || defaultServerOptions.port,
});

const toDisplayHost = (host: string): string => {
  if (host === "0.0.0.0" || host === "::") {
    return "localhost";
  }
  return host;
};

const normalizePath = (value: string): string => {
  if (!value || value === "/") {
    return "/";
  }
  return value.endsWith("/") && value.length > 1 ? value.slice(0, -1) : value;
};

const isRouteNotFoundError = (error: any) => {
  return typeof error?.message === "string" && error.message.startsWith("No route registered for");
};

const isViewResult = (payload: any): payload is HttpViewResult => {
  return payload?.__xtaskView === true && typeof payload?.template === "string";
};

type ExpressAdapterConstructor = new (app: any) => HttpAdapter;
type FastifyAdapterConstructor = new (app: any) => HttpAdapter;

type TypeOrmInitializeFn = (container: Container) => Promise<void>;
type TypeOrmShutdownFn = () => Promise<void>;
type SecurityInitializeFn = (container: Container) => Promise<void>;
type SecurityShutdownFn = () => Promise<void>;
type MailerInitializeFn = (container: Container) => Promise<void>;
type MailerShutdownFn = () => Promise<void>;
type CacheInitializeFn = (container: Container, lifecycle?: ApplicationLifeCycle) => Promise<void>;
type CacheShutdownFn = () => Promise<void>;
type SchedulerInitializeFn = (container: Container, lifecycle: ApplicationLifeCycle) => Promise<void>;
type SchedulerShutdownFn = () => Promise<void>;
type QueueInitializeFn = (container: Container, lifecycle: ApplicationLifeCycle) => Promise<void>;
type QueueShutdownFn = () => Promise<void>;
type SocketIoInitializeFn = (
  container: Container,
  lifecycle: ApplicationLifeCycle,
  adapter?: HttpAdapter
) => Promise<void>;
type SocketIoShutdownFn = () => Promise<void>;
type CqrsInitializeFn = (container: Container, lifecycle?: ApplicationLifeCycle) => Promise<void>;
type CqrsShutdownFn = () => Promise<void>;
type EventSourceInitializeFn = (container: Container, lifecycle?: ApplicationLifeCycle) => Promise<void>;
type EventSourceShutdownFn = () => Promise<void>;
type InternationalizationInitializeFn = (container: Container) => Promise<void>;
type InternationalizationShutdownFn = () => Promise<void>;
type InternationalizationContextRunnerFn = <T>(
  request: any,
  callback: () => Promise<T> | T
) => Promise<T>;
type ThrottlerInitializeFn = (container: Container, lifecycle?: ApplicationLifeCycle) => Promise<void>;
type ThrottlerShutdownFn = () => Promise<void>;
type ConfigInitializeFn = (container: Container, lifecycle?: ApplicationLifeCycle) => Promise<void>;
type ConfigShutdownFn = () => Promise<void>;
type ValidationInitializeFn = (container: Container, lifecycle?: ApplicationLifeCycle) => Promise<void>;
type ValidationShutdownFn = () => Promise<void>;
type McpInitializeFn = (container: Container, lifecycle?: ApplicationLifeCycle) => Promise<void>;
type McpShutdownFn = () => Promise<void>;
type CreateDefaultValidationPipeFn = () => { transform: (value: unknown, context: unknown) => unknown | Promise<unknown> };

type HttpIntegrationResolverOverrides = {
  expressAdapter?: ExpressAdapterConstructor;
  fastifyAdapter?: FastifyAdapterConstructor;
  socketIoInitialize?: SocketIoInitializeFn;
  socketIoShutdown?: SocketIoShutdownFn;
  cqrsInitialize?: CqrsInitializeFn;
  cqrsShutdown?: CqrsShutdownFn;
  mailerInitialize?: MailerInitializeFn;
  mailerShutdown?: MailerShutdownFn;
  cacheInitialize?: CacheInitializeFn;
  cacheShutdown?: CacheShutdownFn;
  internationalizationInitialize?: InternationalizationInitializeFn;
  internationalizationShutdown?: InternationalizationShutdownFn;
  internationalizationContextRunner?: InternationalizationContextRunnerFn;
  configInitialize?: ConfigInitializeFn;
  configShutdown?: ConfigShutdownFn;
  validationInitialize?: ValidationInitializeFn;
  validationShutdown?: ValidationShutdownFn;
  mcpInitialize?: McpInitializeFn;
  mcpShutdown?: McpShutdownFn;
  validationCreateGlobalPipe?: CreateDefaultValidationPipeFn;
};

let httpIntegrationResolverOverrides: HttpIntegrationResolverOverrides | undefined;

export const setHttpIntegrationResolverOverridesForTesting = (
  overrides?: HttpIntegrationResolverOverrides
): void => {
  httpIntegrationResolverOverrides = overrides;
};

export const clearHttpIntegrationResolverOverridesForTesting = (): void => {
  httpIntegrationResolverOverrides = undefined;
};

const resolveExpressAdapter = (): ExpressAdapterConstructor => {
  if (httpIntegrationResolverOverrides?.expressAdapter) {
    return httpIntegrationResolverOverrides.expressAdapter;
  }

  try {
    const expressHttpPackage = require("@xtaskjs/express-http") as {
      ExpressAdapter?: ExpressAdapterConstructor;
    };

    if (typeof expressHttpPackage.ExpressAdapter !== "function") {
      throw new Error("@xtaskjs/express-http does not export ExpressAdapter");
    }

    return expressHttpPackage.ExpressAdapter;
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/express-http");

    if (missingPackage) {
      throw new Error(
        "express adapter requires @xtaskjs/express-http. Install it with: npm install @xtaskjs/express-http"
      );
    }

    throw error;
  }
};

const resolveFastifyAdapter = (): FastifyAdapterConstructor => {
  if (httpIntegrationResolverOverrides?.fastifyAdapter) {
    return httpIntegrationResolverOverrides.fastifyAdapter;
  }

  try {
    const fastifyHttpPackage = require("@xtaskjs/fastify-http") as {
      FastifyAdapter?: FastifyAdapterConstructor;
    };

    if (typeof fastifyHttpPackage.FastifyAdapter !== "function") {
      throw new Error("@xtaskjs/fastify-http does not export FastifyAdapter");
    }

    return fastifyHttpPackage.FastifyAdapter;
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/fastify-http");

    if (missingPackage) {
      throw new Error(
        "fastify adapter requires @xtaskjs/fastify-http. Install it with: npm install @xtaskjs/fastify-http"
      );
    }

    throw error;
  }
};

const resolveTypeOrmInitialize = (): TypeOrmInitializeFn | undefined => {
  if (!isPackageDeclaredInApplication("@xtaskjs/typeorm")) {
    return undefined;
  }

  try {
    const typeormPackage = requireFromApplication<{
      initializeTypeOrmIntegration?: TypeOrmInitializeFn;
    }>("@xtaskjs/typeorm");

    if (typeof typeormPackage.initializeTypeOrmIntegration === "function") {
      return typeormPackage.initializeTypeOrmIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/typeorm");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveTypeOrmShutdown = (): TypeOrmShutdownFn | undefined => {
  if (!isPackageDeclaredInApplication("@xtaskjs/typeorm")) {
    return undefined;
  }

  try {
    const typeormPackage = requireFromApplication<{
      shutdownTypeOrmIntegration?: TypeOrmShutdownFn;
    }>("@xtaskjs/typeorm");

    if (typeof typeormPackage.shutdownTypeOrmIntegration === "function") {
      return typeormPackage.shutdownTypeOrmIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/typeorm");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveSecurityInitialize = (): SecurityInitializeFn | undefined => {
  if (!isPackageDeclaredInApplication("@xtaskjs/security")) {
    return undefined;
  }

  try {
    const securityPackage = requireFromApplication<{
      initializeSecurityIntegration?: SecurityInitializeFn;
    }>("@xtaskjs/security");

    if (typeof securityPackage.initializeSecurityIntegration === "function") {
      return securityPackage.initializeSecurityIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/security");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveSecurityShutdown = (): SecurityShutdownFn | undefined => {
  if (!isPackageDeclaredInApplication("@xtaskjs/security")) {
    return undefined;
  }

  try {
    const securityPackage = requireFromApplication<{
      shutdownSecurityIntegration?: SecurityShutdownFn;
    }>("@xtaskjs/security");

    if (typeof securityPackage.shutdownSecurityIntegration === "function") {
      return securityPackage.shutdownSecurityIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/security");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveMailerInitialize = (): MailerInitializeFn | undefined => {
  const override = httpIntegrationResolverOverrides?.mailerInitialize;
  if (typeof override === "function") {
    return override;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/mailer")) {
    return undefined;
  }

  try {
    const mailerPackage = requireFromApplication<{
      initializeMailerIntegration?: MailerInitializeFn;
    }>("@xtaskjs/mailer");

    if (typeof mailerPackage.initializeMailerIntegration === "function") {
      return mailerPackage.initializeMailerIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/mailer");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveMailerShutdown = (): MailerShutdownFn | undefined => {
  const override = httpIntegrationResolverOverrides?.mailerShutdown;
  if (typeof override === "function") {
    return override;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/mailer")) {
    return undefined;
  }

  try {
    const mailerPackage = requireFromApplication<{
      shutdownMailerIntegration?: MailerShutdownFn;
    }>("@xtaskjs/mailer");

    if (typeof mailerPackage.shutdownMailerIntegration === "function") {
      return mailerPackage.shutdownMailerIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/mailer");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveCacheInitialize = (): CacheInitializeFn | undefined => {
  const override = httpIntegrationResolverOverrides?.cacheInitialize;
  if (typeof override === "function") {
    return override;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/cache")) {
    return undefined;
  }

  try {
    const cachePackage = requireFromApplication<{
      initializeCacheIntegration?: CacheInitializeFn;
    }>("@xtaskjs/cache");

    if (typeof cachePackage.initializeCacheIntegration === "function") {
      return cachePackage.initializeCacheIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/cache");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveCacheShutdown = (): CacheShutdownFn | undefined => {
  const override = httpIntegrationResolverOverrides?.cacheShutdown;
  if (typeof override === "function") {
    return override;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/cache")) {
    return undefined;
  }

  try {
    const cachePackage = requireFromApplication<{
      shutdownCacheIntegration?: CacheShutdownFn;
    }>("@xtaskjs/cache");

    if (typeof cachePackage.shutdownCacheIntegration === "function") {
      return cachePackage.shutdownCacheIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/cache");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveSchedulerInitialize = (): SchedulerInitializeFn | undefined => {
  if (!isPackageDeclaredInApplication("@xtaskjs/scheduler")) {
    return undefined;
  }

  try {
    const schedulerPackage = requireFromApplication<{
      initializeSchedulerIntegration?: SchedulerInitializeFn;
    }>("@xtaskjs/scheduler");

    if (typeof schedulerPackage.initializeSchedulerIntegration === "function") {
      return schedulerPackage.initializeSchedulerIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/scheduler");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveSchedulerShutdown = (): SchedulerShutdownFn | undefined => {
  if (!isPackageDeclaredInApplication("@xtaskjs/scheduler")) {
    return undefined;
  }

  try {
    const schedulerPackage = requireFromApplication<{
      shutdownSchedulerIntegration?: SchedulerShutdownFn;
    }>("@xtaskjs/scheduler");

    if (typeof schedulerPackage.shutdownSchedulerIntegration === "function") {
      return schedulerPackage.shutdownSchedulerIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/scheduler");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveQueueInitialize = (): QueueInitializeFn | undefined => {
  if (!isPackageDeclaredInApplication("@xtaskjs/queues")) {
    return undefined;
  }

  try {
    const queuesPackage = requireFromApplication<{
      initializeQueueIntegration?: QueueInitializeFn;
    }>("@xtaskjs/queues");

    if (typeof queuesPackage.initializeQueueIntegration === "function") {
      return queuesPackage.initializeQueueIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/queues");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveQueueShutdown = (): QueueShutdownFn | undefined => {
  if (!isPackageDeclaredInApplication("@xtaskjs/queues")) {
    return undefined;
  }

  try {
    const queuesPackage = requireFromApplication<{
      shutdownQueueIntegration?: QueueShutdownFn;
    }>("@xtaskjs/queues");

    if (typeof queuesPackage.shutdownQueueIntegration === "function") {
      return queuesPackage.shutdownQueueIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/queues");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveSocketIoInitialize = (): SocketIoInitializeFn | undefined => {
  const override = httpIntegrationResolverOverrides?.socketIoInitialize;
  if (typeof override === "function") {
    return override;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/socket-io")) {
    return undefined;
  }

  try {
    const socketIoPackage = requireFromApplication<{
      initializeSocketIoIntegration?: SocketIoInitializeFn;
    }>("@xtaskjs/socket-io");

    if (typeof socketIoPackage.initializeSocketIoIntegration === "function") {
      return socketIoPackage.initializeSocketIoIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/socket-io");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveSocketIoShutdown = (): SocketIoShutdownFn | undefined => {
  const override = httpIntegrationResolverOverrides?.socketIoShutdown;
  if (typeof override === "function") {
    return override;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/socket-io")) {
    return undefined;
  }

  try {
    const socketIoPackage = requireFromApplication<{
      shutdownSocketIoIntegration?: SocketIoShutdownFn;
    }>("@xtaskjs/socket-io");

    if (typeof socketIoPackage.shutdownSocketIoIntegration === "function") {
      return socketIoPackage.shutdownSocketIoIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/socket-io");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveCqrsInitialize = (): CqrsInitializeFn | undefined => {
  const override = httpIntegrationResolverOverrides?.cqrsInitialize;
  if (typeof override === "function") {
    return override;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/cqrs")) {
    return undefined;
  }

  try {
    const cqrsPackage = requireFromApplication<{
      initializeCqrsIntegration?: CqrsInitializeFn;
    }>("@xtaskjs/cqrs");

    if (typeof cqrsPackage.initializeCqrsIntegration === "function") {
      return cqrsPackage.initializeCqrsIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/cqrs");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveCqrsShutdown = (): CqrsShutdownFn | undefined => {
  const override = httpIntegrationResolverOverrides?.cqrsShutdown;
  if (typeof override === "function") {
    return override;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/cqrs")) {
    return undefined;
  }

  try {
    const cqrsPackage = requireFromApplication<{
      shutdownCqrsIntegration?: CqrsShutdownFn;
    }>("@xtaskjs/cqrs");

    if (typeof cqrsPackage.shutdownCqrsIntegration === "function") {
      return cqrsPackage.shutdownCqrsIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/cqrs");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveEventSourceInitialize = (): EventSourceInitializeFn | undefined => {
  if (!isPackageDeclaredInApplication("@xtaskjs/event-source")) {
    return undefined;
  }

  try {
    const eventSourcePackage = requireFromApplication<{
      initializeEventSourceIntegration?: EventSourceInitializeFn;
    }>("@xtaskjs/event-source");

    if (typeof eventSourcePackage.initializeEventSourceIntegration === "function") {
      return eventSourcePackage.initializeEventSourceIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/event-source");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveEventSourceShutdown = (): EventSourceShutdownFn | undefined => {
  if (!isPackageDeclaredInApplication("@xtaskjs/event-source")) {
    return undefined;
  }

  try {
    const eventSourcePackage = requireFromApplication<{
      shutdownEventSourceIntegration?: EventSourceShutdownFn;
    }>("@xtaskjs/event-source");

    if (typeof eventSourcePackage.shutdownEventSourceIntegration === "function") {
      return eventSourcePackage.shutdownEventSourceIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/event-source");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveInternationalizationInitialize = (): InternationalizationInitializeFn | undefined => {
  const override = httpIntegrationResolverOverrides?.internationalizationInitialize;
  if (typeof override === "function") {
    return override;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/internationalization")) {
    return undefined;
  }

  try {
    const internationalizationPackage = requireFromApplication<{
      initializeInternationalizationIntegration?: InternationalizationInitializeFn;
    }>("@xtaskjs/internationalization");

    if (typeof internationalizationPackage.initializeInternationalizationIntegration === "function") {
      return internationalizationPackage.initializeInternationalizationIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/internationalization");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveInternationalizationShutdown = (): InternationalizationShutdownFn | undefined => {
  const override = httpIntegrationResolverOverrides?.internationalizationShutdown;
  if (typeof override === "function") {
    return override;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/internationalization")) {
    return undefined;
  }

  try {
    const internationalizationPackage = requireFromApplication<{
      shutdownInternationalizationIntegration?: InternationalizationShutdownFn;
    }>("@xtaskjs/internationalization");

    if (typeof internationalizationPackage.shutdownInternationalizationIntegration === "function") {
      return internationalizationPackage.shutdownInternationalizationIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/internationalization");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveInternationalizationContextRunner = (): InternationalizationContextRunnerFn | undefined => {
  const override = httpIntegrationResolverOverrides?.internationalizationContextRunner;
  if (typeof override === "function") {
    return override;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/internationalization")) {
    return undefined;
  }

  try {
    const internationalizationPackage = requireFromApplication<{
      runWithInternationalizationContext?: InternationalizationContextRunnerFn;
    }>("@xtaskjs/internationalization");

    if (typeof internationalizationPackage.runWithInternationalizationContext === "function") {
      return internationalizationPackage.runWithInternationalizationContext;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/internationalization");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveThrottlerInitialize = (): ThrottlerInitializeFn | undefined => {
  if (!isPackageDeclaredInApplication("@xtaskjs/throttler")) {
    return undefined;
  }

  try {
    const throttlerPackage = requireFromApplication<{
      initializeThrottlerIntegration?: ThrottlerInitializeFn;
    }>("@xtaskjs/throttler");

    if (typeof throttlerPackage.initializeThrottlerIntegration === "function") {
      return throttlerPackage.initializeThrottlerIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/throttler");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveThrottlerShutdown = (): ThrottlerShutdownFn | undefined => {
  if (!isPackageDeclaredInApplication("@xtaskjs/throttler")) {
    return undefined;
  }

  try {
    const throttlerPackage = requireFromApplication<{
      shutdownThrottlerIntegration?: ThrottlerShutdownFn;
    }>("@xtaskjs/throttler");

    if (typeof throttlerPackage.shutdownThrottlerIntegration === "function") {
      return throttlerPackage.shutdownThrottlerIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/throttler");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveValidationInitialize = (): ValidationInitializeFn | undefined => {
  if (httpIntegrationResolverOverrides?.validationInitialize) {
    return httpIntegrationResolverOverrides.validationInitialize;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/validation")) {
    return undefined;
  }

  try {
    const validationPackage = requireFromApplication<{
      initializeValidationIntegration?: ValidationInitializeFn;
    }>("@xtaskjs/validation");

    if (typeof validationPackage.initializeValidationIntegration === "function") {
      return validationPackage.initializeValidationIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/validation");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveConfigInitialize = (): ConfigInitializeFn | undefined => {
  const override = httpIntegrationResolverOverrides?.configInitialize;
  if (typeof override === "function") {
    return override;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/config")) {
    return undefined;
  }

  try {
    const configPackage = requireFromApplication<{
      initializeConfigIntegration?: ConfigInitializeFn;
    }>("@xtaskjs/config");

    if (typeof configPackage.initializeConfigIntegration === "function") {
      return configPackage.initializeConfigIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/config");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveConfigShutdown = (): ConfigShutdownFn | undefined => {
  const override = httpIntegrationResolverOverrides?.configShutdown;
  if (typeof override === "function") {
    return override;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/config")) {
    return undefined;
  }

  try {
    const configPackage = requireFromApplication<{
      shutdownConfigIntegration?: ConfigShutdownFn;
    }>("@xtaskjs/config");

    if (typeof configPackage.shutdownConfigIntegration === "function") {
      return configPackage.shutdownConfigIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/config");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveValidationShutdown = (): ValidationShutdownFn | undefined => {
  if (httpIntegrationResolverOverrides?.validationShutdown) {
    return httpIntegrationResolverOverrides.validationShutdown;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/validation")) {
    return undefined;
  }

  try {
    const validationPackage = requireFromApplication<{
      shutdownValidationIntegration?: ValidationShutdownFn;
    }>("@xtaskjs/validation");

    if (typeof validationPackage.shutdownValidationIntegration === "function") {
      return validationPackage.shutdownValidationIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/validation");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveMcpInitialize = (): McpInitializeFn | undefined => {
  const override = httpIntegrationResolverOverrides?.mcpInitialize;
  if (typeof override === "function") {
    return override;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/mcp")) {
    return undefined;
  }

  try {
    const mcpPackage = requireFromApplication<{
      initializeMcpIntegration?: McpInitializeFn;
    }>("@xtaskjs/mcp");

    if (typeof mcpPackage.initializeMcpIntegration === "function") {
      return mcpPackage.initializeMcpIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/mcp");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveMcpShutdown = (): McpShutdownFn | undefined => {
  const override = httpIntegrationResolverOverrides?.mcpShutdown;
  if (typeof override === "function") {
    return override;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/mcp")) {
    return undefined;
  }

  try {
    const mcpPackage = requireFromApplication<{
      shutdownMcpIntegration?: McpShutdownFn;
    }>("@xtaskjs/mcp");

    if (typeof mcpPackage.shutdownMcpIntegration === "function") {
      return mcpPackage.shutdownMcpIntegration;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/mcp");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

const resolveDefaultValidationPipeFactory = (): CreateDefaultValidationPipeFn | undefined => {
  if (httpIntegrationResolverOverrides?.validationCreateGlobalPipe) {
    return httpIntegrationResolverOverrides.validationCreateGlobalPipe;
  }

  if (!isPackageDeclaredInApplication("@xtaskjs/validation")) {
    return undefined;
  }

  try {
    const validationPackage = requireFromApplication<{
      createDefaultValidationPipe?: CreateDefaultValidationPipeFn;
    }>("@xtaskjs/validation");

    if (typeof validationPackage.createDefaultValidationPipe === "function") {
      return validationPackage.createDefaultValidationPipe;
    }
  } catch (error: any) {
    const missingPackage =
      error?.code === "MODULE_NOT_FOUND" ||
      String(error?.message || "").includes("@xtaskjs/validation");

    if (!missingPackage) {
      throw error;
    }
  }

  return undefined;
};

export const createGlobalValidationPipe = (): { transform: (value: unknown, context: unknown) => unknown | Promise<unknown> } => {
  const createDefaultValidationPipe = resolveDefaultValidationPipeFactory();
  if (createDefaultValidationPipe) {
    return createDefaultValidationPipe();
  }

  return new ValidationPipe();
};

export class XTaskHttpApplication {
  private readonly adapter: HttpAdapter;
  private readonly lifecycle: ApplicationLifeCycle;
  private readonly kernel: Kernel;

  constructor(params: {
    adapter: HttpAdapter;
    lifecycle: ApplicationLifeCycle;
    kernel: Kernel;
  }) {
    this.adapter = params.adapter;
    this.lifecycle = params.lifecycle;
    this.kernel = params.kernel;
    this.adapter.registerRequestHandler(this.dispatchRequest.bind(this));
  }

  private async dispatchRequest(
    method: HttpMethod,
    path: string,
    req: HttpRequestLike,
    res: HttpResponseLike
  ): Promise<void> {
    const runWithInternationalizationContext = resolveInternationalizationContextRunner();
    if (runWithInternationalizationContext) {
      await runWithInternationalizationContext(req, () =>
        this.dispatchRequestInternal(method, path, req, res)
      );
      return;
    }

    await this.dispatchRequestInternal(method, path, req, res);
  }

  private async dispatchRequestInternal(
    method: HttpMethod,
    path: string,
    req: HttpRequestLike,
    res: HttpResponseLike
  ): Promise<void> {
    try {
      const result = await this.lifecycle.dispatchControllerRoute(method, normalizePath(path), req, res);
      if (res.headersSent) {
        return;
      }

      if (result === undefined) {
        res.statusCode = 204;
        res.end?.();
        return;
      }

      if (isViewResult(result)) {
        if (this.adapter.renderView) {
          await this.adapter.renderView(req, res, result);
          return;
        }

        throw new Error(
          `Adapter '${this.adapter.type}' does not support view rendering. Configure a template engine in the selected adapter.`
        );
      }

      if (typeof result === "object") {
        if (typeof res.json === "function") {
          res.json(result);
          return;
        }
        res.statusCode = res.statusCode || 200;
        res.setHeader?.("content-type", "application/json");
        res.end?.(JSON.stringify(result));
        return;
      }

      res.statusCode = res.statusCode || 200;
      if (typeof res.send === "function") {
        res.send(result);
        return;
      }
      res.end?.(String(result));
    } catch (error) {
      if (res.headersSent) {
        return;
      }

      if (isRouteNotFoundError(error)) {
        if (typeof res.status === "function" && typeof res.send === "function") {
          res.status(404).send("Not Found");
          return;
        }
        res.statusCode = 404;
        res.end?.("Not Found");
        return;
      }

      if (error instanceof HttpError || typeof error?.statusCode === "number") {
        const statusCode = error instanceof HttpError ? error.statusCode : error.statusCode;
        const payload =
          error?.payload !== undefined
            ? error.payload
            : { message: error?.message || "Request failed" };

        if (typeof res.status === "function" && typeof res.json === "function") {
          res.status(statusCode).json(payload);
          return;
        }

        res.statusCode = statusCode;
        res.setHeader?.("content-type", "application/json");
        res.end?.(JSON.stringify(payload));
        return;
      }

      if (typeof res.status === "function" && typeof res.json === "function") {
        res.status(500).json({ message: "Internal Server Error", error: error?.message });
        return;
      }

      res.statusCode = 500;
      res.setHeader?.("content-type", "application/json");
      res.end?.(JSON.stringify({ message: "Internal Server Error", error: error?.message }));
    }
  }

  async listen(options?: HttpServerOptions): Promise<void> {
    const serverOptions = normalizeServerOptions(options);
    await this.adapter.listen(serverOptions);

    const initializeSocketIoIntegration = resolveSocketIoInitialize();
    if (initializeSocketIoIntegration && this.kernel && typeof (this.kernel as any).getContainer === "function") {
      const container = await (this.kernel as any).getContainer();
      await initializeSocketIoIntegration(container, this.lifecycle, this.adapter);
    }

    if (process.env.NODE_ENV !== "test") {
      const displayHost = toDisplayHost(serverOptions.host);
      const url = `http://${displayHost}:${serverOptions.port}`;
      console.log(`[HTTP] Server started | adapter=${this.adapter.type} | url=${url}`);
    }
  }

  async close(): Promise<void> {
    if (typeof (this.lifecycle as any).emit === "function") {
      await (this.lifecycle as any).emit("stopping");
    }

    const shutdownSocketIoIntegration = resolveSocketIoShutdown();
    if (shutdownSocketIoIntegration) {
      await shutdownSocketIoIntegration();
    }

    await this.adapter.close();

    if (typeof (this.lifecycle as any).stop === "function") {
      await (this.lifecycle as any).stop();
    }

    const shutdownTypeOrmIntegration = resolveTypeOrmShutdown();
    const shutdownCqrsIntegration = resolveCqrsShutdown();
    const shutdownEventSourceIntegration = resolveEventSourceShutdown();
    if (shutdownCqrsIntegration) {
      await shutdownCqrsIntegration();
    }

    if (shutdownEventSourceIntegration) {
      await shutdownEventSourceIntegration();
    }

    if (shutdownTypeOrmIntegration) {
      await shutdownTypeOrmIntegration();
    }

    const shutdownSecurityIntegration = resolveSecurityShutdown();
    if (shutdownSecurityIntegration) {
      await shutdownSecurityIntegration();
    }

    const shutdownMailerIntegration = resolveMailerShutdown();
    if (shutdownMailerIntegration) {
      await shutdownMailerIntegration();
    }

    const shutdownCacheIntegration = resolveCacheShutdown();
    if (shutdownCacheIntegration) {
      await shutdownCacheIntegration();
    }

    const shutdownSchedulerIntegration = resolveSchedulerShutdown();
    if (shutdownSchedulerIntegration) {
      await shutdownSchedulerIntegration();
    }

    const shutdownQueueIntegration = resolveQueueShutdown();
    if (shutdownQueueIntegration) {
      await shutdownQueueIntegration();
    }

    const shutdownInternationalizationIntegration = resolveInternationalizationShutdown();
    if (shutdownInternationalizationIntegration) {
      await shutdownInternationalizationIntegration();
    }

    const shutdownThrottlerIntegration = resolveThrottlerShutdown();
    if (shutdownThrottlerIntegration) {
      await shutdownThrottlerIntegration();
    }

    const shutdownValidationIntegration = resolveValidationShutdown();
    if (shutdownValidationIntegration) {
      await shutdownValidationIntegration();
    }

    const shutdownMcpIntegration = resolveMcpShutdown();
    if (shutdownMcpIntegration) {
      await shutdownMcpIntegration();
    }

    const shutdownConfigIntegration = resolveConfigShutdown();
    if (shutdownConfigIntegration) {
      await shutdownConfigIntegration();
    }

    if (this.kernel && typeof (this.kernel as any).getContainer === "function") {
      const container = await (this.kernel as any).getContainer();
      if (container && typeof container.destroy === "function") {
        container.destroy();
      }
      clearCurrentContainer();
    }

    if (typeof (this.lifecycle as any).emit === "function") {
      await (this.lifecycle as any).emit("stopped");
    }
  }

  getKernel(): Kernel {
    return this.kernel;
  }

  getLifecycle(): ApplicationLifeCycle {
    return this.lifecycle;
  }
}

export function createHttpAdapter(
  adapter: HttpAdapter | HttpAdapterType = "node-http",
  adapterInstance?: any
): HttpAdapter {
  if (typeof adapter !== "string") {
    return adapter;
  }

  if (adapter === "node-http") {
    return new NodeHttpAdapter();
  }

  if (!adapterInstance) {
    throw new Error(`${adapter} adapter requires 'adapterInstance' in CreateApplicationOptions`);
  }

  if (adapter === "express") {
    const ExpressAdapter = resolveExpressAdapter();
    return new ExpressAdapter(adapterInstance);
  }

  if (adapter === "fastify") {
    const FastifyAdapter = resolveFastifyAdapter();
    return new FastifyAdapter(adapterInstance);
  }

  throw new Error(`Unsupported adapter type: ${adapter}`);
}

export async function registerContainerInLifecycle(
  kernel: Kernel,
  lifecycle: ApplicationLifeCycle
): Promise<void> {
  const container: Container = await kernel.getContainer();
  setCurrentContainer(container);

  const initializeConfigIntegration = resolveConfigInitialize();
  if (initializeConfigIntegration) {
    await initializeConfigIntegration(container, lifecycle);
  }

  const initializeSocketIoIntegration = resolveSocketIoInitialize();
  if (initializeSocketIoIntegration) {
    await initializeSocketIoIntegration(container, lifecycle);
  }

  const initializeTypeOrmIntegration = resolveTypeOrmInitialize();
  if (initializeTypeOrmIntegration) {
    await initializeTypeOrmIntegration(container);
  }

  const initializeCqrsIntegration = resolveCqrsInitialize();
  if (initializeCqrsIntegration) {
    await initializeCqrsIntegration(container, lifecycle);
  }

  const initializeEventSourceIntegration = resolveEventSourceInitialize();
  if (
    initializeEventSourceIntegration &&
    typeof (container as any).getRegisteredTypes === "function"
  ) {
    await initializeEventSourceIntegration(container, lifecycle);
  }

  const initializeSecurityIntegration = resolveSecurityInitialize();
  if (initializeSecurityIntegration) {
    await initializeSecurityIntegration(container);
  }

  const initializeMailerIntegration = resolveMailerInitialize();
  if (initializeMailerIntegration) {
    await initializeMailerIntegration(container);
  }

  const initializeCacheIntegration = resolveCacheInitialize();
  if (initializeCacheIntegration) {
    await initializeCacheIntegration(container, lifecycle);
  }

  const initializeSchedulerIntegration = resolveSchedulerInitialize();
  if (initializeSchedulerIntegration) {
    await initializeSchedulerIntegration(container, lifecycle);
  }

  const initializeQueueIntegration = resolveQueueInitialize();
  if (initializeQueueIntegration) {
    await initializeQueueIntegration(container, lifecycle);
  }

  const initializeInternationalizationIntegration = resolveInternationalizationInitialize();
  if (initializeInternationalizationIntegration) {
    await initializeInternationalizationIntegration(container);
  }

  const initializeThrottlerIntegration = resolveThrottlerInitialize();
  if (initializeThrottlerIntegration) {
    await initializeThrottlerIntegration(container, lifecycle);
  }

  const initializeValidationIntegration = resolveValidationInitialize();
  if (initializeValidationIntegration) {
    await initializeValidationIntegration(container, lifecycle);
  }

  const initializeMcpIntegration = resolveMcpInitialize();
  if (initializeMcpIntegration) {
    await initializeMcpIntegration(container, lifecycle);
  }

  container.registerLifeCycleListeners(lifecycle);
}
