const INTERNATIONALIZATION_SERVICE_TOKEN = "xtask:internationalization:service";
const INTERNATIONALIZATION_LIFECYCLE_TOKEN = "xtask:internationalization:lifecycle";

export const getInternationalizationServiceToken = (): string => {
  return INTERNATIONALIZATION_SERVICE_TOKEN;
};

export const getInternationalizationLifecycleToken = (): string => {
  return INTERNATIONALIZATION_LIFECYCLE_TOKEN;
};