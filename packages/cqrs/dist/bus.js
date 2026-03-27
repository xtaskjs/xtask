"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = exports.QueryBus = exports.CommandBus = void 0;
class CommandBus {
    constructor(dispatch) {
        this.dispatch = dispatch;
    }
    async execute(command) {
        return this.dispatch(command);
    }
}
exports.CommandBus = CommandBus;
class QueryBus {
    constructor(dispatch) {
        this.dispatch = dispatch;
    }
    async execute(query) {
        return this.dispatch(query);
    }
}
exports.QueryBus = QueryBus;
class EventBus {
    constructor(dispatch) {
        this.dispatch = dispatch;
    }
    async publish(event) {
        await this.dispatch(event);
    }
}
exports.EventBus = EventBus;
