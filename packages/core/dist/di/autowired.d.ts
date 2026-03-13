import "reflect-metadata";
export interface AutoWiredMetaData {
    type: any;
    required: boolean;
    qualifier?: string;
}
export declare function AutoWired(options?: {
    required?: boolean;
    qualifier?: string;
}): (target: any, propertyKey: string | symbol) => void;
export declare function getAutoWiredProperties(target: any): Map<string | symbol, AutoWiredMetaData>;
export declare const Autowired: typeof AutoWired;
