export type ThrottleDriver = "memory" | "redis";
export type ThrottleTtlInput = number | string;
export type ThrottleKeyGenerator = (context: ThrottleKeyContext) => string | Promise<string>;
export type ThrottleSkipCondition = (context: ThrottleKeyContext) => boolean | Promise<boolean>;

export interface ThrottleKeyContext {
  request?: any;
  method?: string;
  path?: string;
}

export interface ThrottleRecord {
  count: number;
  ttlMs: number;
  resetAt: number;
}

export interface ThrottleStore {
  kind: string;
  connect?: () => Promise<void>;
  disconnect?: () => Promise<void>;
  increment(key: string, ttlMs: number): Promise<ThrottleRecord>;
  reset(key: string): Promise<void>;
}

export interface ThrottleRedisClient {
  eval: (script: string, numkeys: number, ...args: string[]) => Promise<any>;
  connect?: () => Promise<void>;
  quit?: () => Promise<void>;
  disconnect?: () => Promise<void>;
  isOpen?: boolean;
}

export interface ThrottleRedisConnectionOptions {
  url?: string;
  username?: string;
  password?: string;
  database?: number;
  socket?: Record<string, any>;
  connectOnStart?: boolean;
  client?: ThrottleRedisClient;
  clientFactory?: () => ThrottleRedisClient | Promise<ThrottleRedisClient>;
  options?: Record<string, any>;
}

export interface ThrottlerConfiguration {
  limit?: number;
  ttl?: ThrottleTtlInput;
  driver?: ThrottleDriver;
  keyGenerator?: ThrottleKeyGenerator;
  skipIf?: ThrottleSkipCondition;
  errorMessage?: string;
  redis?: ThrottleRedisConnectionOptions;
}

export interface RegisteredThrottlerConfiguration {
  limit: number;
  ttlMs: number;
  driver: ThrottleDriver;
  keyGenerator: ThrottleKeyGenerator;
  skipIf?: ThrottleSkipCondition;
  errorMessage: string;
  redis?: ThrottleRedisConnectionOptions;
}

export interface ThrottleOptions {
  keyGenerator?: ThrottleKeyGenerator;
  skipIf?: ThrottleSkipCondition;
  errorMessage?: string;
}

export interface ThrottleMetadata {
  limit: number;
  ttlMs: number;
  options: ThrottleOptions;
}

export interface ThrottleResult {
  allowed: boolean;
  count: number;
  limit: number;
  ttlMs: number;
  resetAt: number;
}
