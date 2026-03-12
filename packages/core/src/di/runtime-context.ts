import { Container } from "./container";

let currentContainer: Container | undefined;

export const setCurrentContainer = (container: Container): void => {
  currentContainer = container;
};

export const clearCurrentContainer = (): void => {
  currentContainer = undefined;
};

export const getCurrentContainer = (): Container | undefined => {
  return currentContainer;
};
