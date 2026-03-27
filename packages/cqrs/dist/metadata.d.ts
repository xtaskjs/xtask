import "reflect-metadata";
import { IdempotentCommandOptions, MessageReference } from "./types";
export interface CommandHandlerMetadata {
    command: MessageReference;
}
export interface QueryHandlerMetadata {
    query: MessageReference;
}
export interface EventHandlerMetadata {
    events: MessageReference[];
}
export interface ProcessManagerMetadata {
    events: MessageReference[];
}
export interface ProjectionRebuilderMetadata {
    name: string;
}
export interface IdempotentCommandMetadata extends IdempotentCommandOptions<any> {
}
export declare const ensureServiceMetadata: (target: any) => void;
export declare const defineCommandHandlerMetadata: (target: any, command: MessageReference) => void;
export declare const defineQueryHandlerMetadata: (target: any, query: MessageReference) => void;
export declare const defineEventHandlerMetadata: (target: any, events: MessageReference[]) => void;
export declare const defineProcessManagerMetadata: (target: any, events: MessageReference[]) => void;
export declare const defineProjectionRebuilderMetadata: (target: any, name: string) => void;
export declare const defineIdempotentCommandMetadata: (target: any, options: IdempotentCommandOptions<any>) => void;
export declare const getCommandHandlerMetadata: (target: any) => CommandHandlerMetadata | undefined;
export declare const getQueryHandlerMetadata: (target: any) => QueryHandlerMetadata | undefined;
export declare const getEventHandlerMetadata: (target: any) => EventHandlerMetadata | undefined;
export declare const getProcessManagerMetadata: (target: any) => ProcessManagerMetadata | undefined;
export declare const getProjectionRebuilderMetadata: (target: any) => ProjectionRebuilderMetadata | undefined;
export declare const getIdempotentCommandMetadata: (target: any) => IdempotentCommandMetadata | undefined;
export declare const resolveMessageName: (reference: MessageReference | string) => string;
export declare const resolvePayloadMessageName: (value: any) => string;
