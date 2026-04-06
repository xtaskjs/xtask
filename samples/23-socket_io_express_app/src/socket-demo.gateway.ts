import { Logger } from "@xtaskjs/common";
import { Service } from "@xtaskjs/core";
import {
  OnSocketConnection,
  OnSocketDisconnect,
  OnSocketEvent,
  SocketGateway,
} from "@xtaskjs/socket-io";

interface JoinRoomPayload {
  room?: string;
  user?: string;
}

interface ChatMessagePayload {
  room?: string;
  user?: string;
  text?: string;
}

@Service()
@SocketGateway({ namespace: "/chat", group: ["realtime", "chat"] })
export class SocketDemoGateway {
  private readonly connectedClients = new Set<string>();
  private readonly recentEvents: string[] = [];
  private readonly recentMessages: Array<{
    user: string;
    room: string;
    text: string;
    socketId: string;
    sentAt: string;
  }> = [];

  constructor(private readonly logger: Logger) {}

  @OnSocketConnection()
  onConnect(socket: any, context: any) {
    this.connectedClients.add(socket.id);
    this.record(`connect:${socket.id}`);
    socket.join("lobby");
    context.namespace.emit("presence.updated", {
      connectedClients: this.connectedClients.size,
      room: "lobby",
    });
    socket.emit("server.state", this.getSnapshot());
    this.logger.info(`Socket connected: ${socket.id}`);
  }

  @OnSocketEvent("chat.join")
  onJoinRoom(payload: JoinRoomPayload = {}, context: any) {
    const room = normalizeRoom(payload.room);
    const user = normalizeUser(payload.user);

    context.socket.join(room);
    this.record(`join:${context.socket.id}:${room}`);
    context.namespace.to(room).emit("room.joined", {
      room,
      user,
      socketId: context.socket.id,
      connectedClients: this.connectedClients.size,
    });

    return {
      ok: true,
      room,
      user,
      connectedClients: this.connectedClients.size,
    };
  }

  @OnSocketEvent("chat.message")
  onChatMessage(payload: ChatMessagePayload = {}, context: any) {
    const room = normalizeRoom(payload.room);
    const user = normalizeUser(payload.user);
    const text = String(payload.text || "").trim();

    if (!text) {
      return {
        ok: false,
        error: "Message text is required",
      };
    }

    const message = {
      room,
      user,
      text,
      socketId: context.socket.id,
      sentAt: new Date().toISOString(),
    };

    this.recentMessages.push(message);
    if (this.recentMessages.length > 20) {
      this.recentMessages.shift();
    }

    this.record(`message:${context.socket.id}:${room}:${text}`);
    context.namespace.to(room).emit("chat.message", message);

    return {
      ok: true,
      message,
    };
  }

  @OnSocketDisconnect()
  onDisconnect(reason: string, socket: any, context: any) {
    this.connectedClients.delete(socket.id);
    this.record(`disconnect:${socket.id}:${reason}`);
    context.namespace.emit("presence.updated", {
      connectedClients: this.connectedClients.size,
      reason,
    });
    this.logger.info(`Socket disconnected: ${socket.id} (${reason})`);
  }

  getSnapshot() {
    return {
      namespace: "/chat",
      connectedClients: this.connectedClients.size,
      recentEvents: [...this.recentEvents],
      recentMessages: [...this.recentMessages],
    };
  }

  private record(event: string) {
    this.recentEvents.push(`${new Date().toISOString()} ${event}`);
    if (this.recentEvents.length > 25) {
      this.recentEvents.shift();
    }
  }
}

const normalizeRoom = (value?: string): string => {
  const normalizedValue = String(value || "lobby").trim();
  return normalizedValue || "lobby";
};

const normalizeUser = (value?: string): string => {
  const normalizedValue = String(value || "guest").trim();
  return normalizedValue || "guest";
};