# @xtaskjs/socket-io

Socket.IO integration package for xtaskjs.

This package is part of the xtaskjs project, hosted at [xtaskjs.io](https://xtaskjs.io).

## Installation
```bash
npm install @xtaskjs/socket-io socket.io reflect-metadata
```

## What It Provides
- Gateway decorators for connection, disconnection, and named Socket.IO events.
- xtaskjs DI integration so gateways remain regular `@Service()` classes.
- Lifecycle integration that attaches to the live HTTP server during `app.listen()` and closes during `app.close()`.
- Injectable tokens for the Socket.IO server, namespaces, lifecycle manager, and helper service.
- A small runtime service for broadcasting events and inspecting discovered gateways.

## Declare A Gateway
```typescript
import { Service } from "@xtaskjs/core";
import {
  OnSocketConnection,
  OnSocketDisconnect,
  OnSocketEvent,
  SocketGateway,
} from "@xtaskjs/socket-io";

@Service()
@SocketGateway({ namespace: "/chat", group: ["realtime", "chat"] })
class ChatGateway {
  @OnSocketConnection()
  onConnect(socket: any) {
    console.log("connected", socket.id);
  }

  @OnSocketEvent("message")
  onMessage(payload: { text: string }, context: { socket: any }) {
    console.log("message", context.socket.id, payload.text);
    return { ok: true };
  }

  @OnSocketDisconnect()
  onDisconnect(reason: string) {
    console.log("disconnected", reason);
  }
}
```

Event handlers receive the event arguments followed by a context object. If the client sent an acknowledgement callback and the handler returns a value, xtaskjs replies through that acknowledgement automatically.

## Broadcast From Services
```typescript
import { Service } from "@xtaskjs/core";
import { InjectSocketService, SocketIoService } from "@xtaskjs/socket-io";

@Service()
class NotificationsService {
  constructor(
    @InjectSocketService()
    private readonly sockets: SocketIoService
  ) {}

  publishSystemNotice(message: string) {
    this.sockets.emit("system.notice", { message }, { namespace: "/chat", room: "admins" });
  }
}
```

## Injection Decorators
- `@InjectSocketService()` injects `SocketIoService`.
- `@InjectSocketLifecycleManager()` injects the lifecycle manager.
- `@InjectSocketServer()` injects the root `Socket.IO` server.
- `@InjectSocketNamespace("/chat")` injects a namespace instance.

## Lifecycle Behavior
- During `app.listen()`: xtaskjs resolves the live HTTP server from the selected adapter and attaches a Socket.IO server.
- After attachment: registered `@SocketGateway()` services are discovered from the DI container and bound to namespaces.
- During `app.close()`: the Socket.IO server is closed before the HTTP adapter and container are torn down.

## Resources
- Project site and documentation: [xtaskjs.io](https://xtaskjs.io)
- npm package: [@xtaskjs/socket-io](https://www.npmjs.com/package/@xtaskjs/socket-io)
- Source repository: [xtaskjs/xtaskjs](https://github.com/xtaskjs/xtaskjs)