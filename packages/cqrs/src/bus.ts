export class CommandBus {
  constructor(private readonly dispatch: (command: any) => Promise<any>) {}

  async execute<TResult = any>(command: any): Promise<TResult> {
    return this.dispatch(command) as Promise<TResult>;
  }
}

export class QueryBus {
  constructor(private readonly dispatch: (query: any) => Promise<any>) {}

  async execute<TResult = any>(query: any): Promise<TResult> {
    return this.dispatch(query) as Promise<TResult>;
  }
}

export class EventBus {
  constructor(private readonly dispatch: (event: any) => Promise<void>) {}

  async publish(event: any): Promise<void> {
    await this.dispatch(event);
  }
}