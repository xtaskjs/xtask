export declare class CommandBus {
    private readonly dispatch;
    constructor(dispatch: (command: any) => Promise<any>);
    execute<TResult = any>(command: any): Promise<TResult>;
}
export declare class QueryBus {
    private readonly dispatch;
    constructor(dispatch: (query: any) => Promise<any>);
    execute<TResult = any>(query: any): Promise<TResult>;
}
export declare class EventBus {
    private readonly dispatch;
    constructor(dispatch: (event: any) => Promise<void>);
    publish(event: any): Promise<void>;
}
