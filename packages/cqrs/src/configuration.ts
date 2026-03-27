import { MemoryIdempotencyStore } from "./idempotency";
import { CqrsOptions } from "./types";

const DEFAULT_READ_DATA_SOURCE_NAME = "read";
const DEFAULT_WRITE_DATA_SOURCE_NAME = "write";

let configuration: Required<CqrsOptions> = {
  readDataSourceName: DEFAULT_READ_DATA_SOURCE_NAME,
  writeDataSourceName: DEFAULT_WRITE_DATA_SOURCE_NAME,
  idempotencyStore: new MemoryIdempotencyStore(),
};

const normalizeName = (value: string | undefined, fallback: string): string => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return fallback;
};

export const configureCqrs = (options: CqrsOptions = {}): Required<CqrsOptions> => {
  configuration = {
    readDataSourceName: normalizeName(options.readDataSourceName, configuration.readDataSourceName),
    writeDataSourceName: normalizeName(options.writeDataSourceName, configuration.writeDataSourceName),
    idempotencyStore: options.idempotencyStore || configuration.idempotencyStore,
  };

  return getCqrsConfiguration();
};

export const getCqrsConfiguration = (): Required<CqrsOptions> => ({
  ...configuration,
});

export const resetCqrsConfiguration = (): void => {
  configuration = {
    readDataSourceName: DEFAULT_READ_DATA_SOURCE_NAME,
    writeDataSourceName: DEFAULT_WRITE_DATA_SOURCE_NAME,
    idempotencyStore: new MemoryIdempotencyStore(),
  };
};

export const Cqrs = (options: CqrsOptions = {}): ClassDecorator => {
  return () => {
    configureCqrs(options);
  };
};