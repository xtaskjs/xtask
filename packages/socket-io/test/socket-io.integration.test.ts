import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { Container, Service, ApplicationLifeCycle } from "@xtaskjs/core";
import {
  getSocketIoNamespaceToken,
  getSocketIoServiceToken,
  InjectSocketLifecycleManager,
  InjectSocketNamespace,
  InjectSocketService,
  OnSocketConnection,
  OnSocketDisconnect,
  OnSocketEvent,
  resetSocketIoIntegration,
  SocketGateway,
  SocketIoLifecycleManager,
  SocketIoService,
  initializeSocketIoIntegration,
} from "../src";

vi.mock("socket.io", () => {
  class MockBroadcastOperator {
    public readonly records: any[];

    constructor(records: any[]) {
      this.records = records;
    }

    to(room: string) {
      this.records.push({ type: "to", room });
      return this;
    }

    except(room: string) {
      this.records.push({ type: "except", room });
      return this;
    }

    compress(value: boolean) {
      this.records.push({ type: "compress", value });
      return this;
    }

    timeout(value: number) {
      this.records.push({ type: "timeout", value });
      return this;
    }

    emit(event: string, payload: any) {
      this.records.push({ type: "emit", event, payload });
    }
  }

  class MockSocket {
    public readonly id: string;
    public readonly joinedRooms: string[] = [];
    private readonly listeners = new Map<string, Array<(...args: any[]) => any>>();
    private readonly onceListeners = new Map<string, Array<(...args: any[]) => any>>();

    constructor(id: string) {
      this.id = id;
    }

    on(event: string, listener: (...args: any[]) => any) {
      const list = this.listeners.get(event) || [];
      list.push(listener);
      this.listeners.set(event, list);
      return this;
    }

    once(event: string, listener: (...args: any[]) => any) {
      const list = this.onceListeners.get(event) || [];
      list.push(listener);
      this.onceListeners.set(event, list);
      return this;
    }

    join(room: string) {
      this.joinedRooms.push(room);
    }

    async dispatch(event: string, ...args: any[]) {
      const listeners = [...(this.listeners.get(event) || [])];
      const onceListeners = [...(this.onceListeners.get(event) || [])];
      this.onceListeners.delete(event);

      for (const listener of [...listeners, ...onceListeners]) {
        await listener(...args);
      }
    }
  }

  class MockNamespace extends MockBroadcastOperator {
    public readonly name: string;
    private readonly listeners = new Map<string, Array<(...args: any[]) => any>>();

    constructor(name: string) {
      super([]);
      this.name = name;
    }

    on(event: string, listener: (...args: any[]) => any) {
      const list = this.listeners.get(event) || [];
      list.push(listener);
      this.listeners.set(event, list);
      return this;
    }

    async connect(socket: MockSocket) {
      const listeners = this.listeners.get("connection") || [];
      for (const listener of listeners) {
        await listener(socket);
      }
    }
  }

  class MockServer extends MockBroadcastOperator {
    public readonly httpServer: any;
    public readonly options: any;
    public readonly namespaces = new Map<string, MockNamespace>();
    public closed = false;

    constructor(httpServer: any, options: any) {
      super([]);
      this.httpServer = httpServer;
      this.options = options;
      this.namespaces.set("/", new MockNamespace("/"));
      mockState.lastServer = this;
    }

    of(namespace: string) {
      const normalizedNamespace = namespace === "/" ? "/" : namespace.replace(/\/$/, "");
      if (!this.namespaces.has(normalizedNamespace)) {
        this.namespaces.set(normalizedNamespace, new MockNamespace(normalizedNamespace));
      }
      return this.namespaces.get(normalizedNamespace)!;
    }

    close(callback?: (error?: Error) => void) {
      this.closed = true;
      callback?.();
    }
  }

  const mockState: { lastServer?: MockServer } = {};

  return {
    Server: MockServer,
    __mockState: mockState,
    __createSocket: (id: string) => new MockSocket(id),
  };
});

@Service()
@SocketGateway({ namespace: "/chat", group: ["chat", "realtime"] })
class ChatGateway {
  public readonly events: string[] = [];

  constructor(
    @InjectSocketService()
    public readonly sockets: SocketIoService,
    @InjectSocketLifecycleManager()
    public readonly lifecycleManager: SocketIoLifecycleManager,
    @InjectSocketNamespace("/chat")
    public readonly namespace: any
  ) {}

  @OnSocketConnection()
  onConnect(socket: any) {
    socket.join("lobby");
    this.events.push(`connect:${socket.id}`);
  }

  @OnSocketEvent("message")
  onMessage(payload: { text: string }, context: { socket: { id: string } }) {
    this.events.push(`message:${context.socket.id}:${payload.text}`);
    return { delivered: true, text: payload.text };
  }

  @OnSocketDisconnect()
  onDisconnect(reason: string, socket: any) {
    this.events.push(`disconnect:${socket.id}:${reason}`);
  }
}

describe("socket-io integration", () => {
  beforeEach(async () => {
    await resetSocketIoIntegration();
  });

  afterEach(async () => {
    await resetSocketIoIntegration();
  });

  test("discovers gateways, wires DI tokens, and handles connection lifecycle", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();
    const httpServer = { on: vi.fn(), listen: vi.fn() } as any;
    const adapter = {
      type: "node-http" as const,
      getHttpServer: () => httpServer,
    };

    container.register(ChatGateway, { scope: "singleton" });

    await initializeSocketIoIntegration(container, lifecycle, adapter);

    const gateway = container.get(ChatGateway);
    const service = container.getByName<SocketIoService>(getSocketIoServiceToken());
    const namespaceByName = container.getByName<any>(getSocketIoNamespaceToken("/chat"));
    const socketIoMock = (await vi.importMock("socket.io")) as any;
    const mockServer = socketIoMock.__mockState?.lastServer;
    const socket = socketIoMock.__createSocket("socket-1");

    expect(mockServer).toBeDefined();

    expect(gateway.sockets).toBe(service);
    expect(gateway.lifecycleManager).toBeInstanceOf(SocketIoLifecycleManager);
    expect(gateway.namespace).toBe(namespaceByName);
    expect(service.listNamespaces()).toEqual(["/", "/chat"]);
    expect(service.listGateways().map((entry) => entry.name)).toEqual(["ChatGateway"]);

    await mockServer.of("/chat").connect(socket);
    expect(gateway.events).toEqual(["connect:socket-1"]);
    expect(socket.joinedRooms).toEqual(["lobby"]);

    const acknowledgement = vi.fn();
    await socket.dispatch("message", { text: "hello" }, acknowledgement);
    expect(gateway.events).toContain("message:socket-1:hello");
    expect(acknowledgement).toHaveBeenCalledWith({ delivered: true, text: "hello" });

    await socket.dispatch("disconnect", "client namespace disconnect");
    expect(gateway.events).toContain("disconnect:socket-1:client namespace disconnect");
  });

  test("broadcasts through the helper service", async () => {
    const container = new Container();
    const lifecycle = new ApplicationLifeCycle();
    const httpServer = { on: vi.fn(), listen: vi.fn() } as any;

    container.register(ChatGateway, { scope: "singleton" });

    await initializeSocketIoIntegration(container, lifecycle, {
      type: "node-http",
      getHttpServer: () => httpServer,
    });

    const service = container.getByName<SocketIoService>(getSocketIoServiceToken());
    const namespace = service.getNamespace("/chat") as any;

    service.emit("announcement", { text: "maintenance" }, { namespace: "/chat", room: "admins" });

    expect(namespace.records).toEqual([
      { type: "to", room: "admins" },
      { type: "emit", event: "announcement", payload: { text: "maintenance" } },
    ]);
  });
});