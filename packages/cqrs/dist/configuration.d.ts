import { CqrsOptions } from "./types";
export declare const configureCqrs: (options?: CqrsOptions) => Required<CqrsOptions>;
export declare const getCqrsConfiguration: () => Required<CqrsOptions>;
export declare const resetCqrsConfiguration: () => void;
export declare const Cqrs: (options?: CqrsOptions) => ClassDecorator;
