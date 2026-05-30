import type { ZodTypeAny } from "zod";
import { configureConfig } from "./configuration";
import type { ConfigModuleAsyncOptions, ConfigModuleOptions, ResolvedConfigModuleOptions } from "./types";

export class ConfigModule {
  static register<TSchema extends ZodTypeAny>(
    options: ConfigModuleOptions<TSchema>
  ): ResolvedConfigModuleOptions {
    return configureConfig(options);
  }

  static async registerAsync<TSchema extends ZodTypeAny>(
    options: ConfigModuleAsyncOptions<TSchema>
  ): Promise<ResolvedConfigModuleOptions> {
    const resolvedOptions = await options.useFactory(options.container);
    return configureConfig(resolvedOptions);
  }
}
