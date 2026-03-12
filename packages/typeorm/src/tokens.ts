const DATA_SOURCE_TOKEN_PREFIX = "xtask:typeorm:datasource";
const REPOSITORY_TOKEN_PREFIX = "xtask:typeorm:repository";

const resolveEntityTokenName = (entity: Function | string): string => {
  if (typeof entity === "string") {
    return entity;
  }

  if (typeof entity.name === "string" && entity.name.trim().length > 0) {
    return entity.name;
  }

  return "anonymous";
};

export const getDataSourceToken = (name = "default"): string => {
  return `${DATA_SOURCE_TOKEN_PREFIX}:${name}`;
};

export const getRepositoryToken = (entity: Function | string, dataSourceName = "default"): string => {
  return `${REPOSITORY_TOKEN_PREFIX}:${dataSourceName}:${resolveEntityTokenName(entity)}`;
};
