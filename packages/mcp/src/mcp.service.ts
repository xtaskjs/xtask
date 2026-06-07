import { getMcpLifecycleManager } from "./lifecycle";
import type {
  BuiltMcpServer,
  McpMethodSummary,
  McpServerSummary,
} from "./types";

export class McpService {
  listServers(group?: string): McpServerSummary[] {
    return getMcpLifecycleManager().listServers(group);
  }

  listMethods(serverName?: string): McpMethodSummary[] {
    return getMcpLifecycleManager().listMethods(serverName);
  }

  listGroups(): string[] {
    return getMcpLifecycleManager().listGroups();
  }

  getServer(name: string): BuiltMcpServer {
    return getMcpLifecycleManager().getServer(name);
  }

  isStarted(): boolean {
    return getMcpLifecycleManager().isStarted();
  }

  async startAll(): Promise<void> {
    await getMcpLifecycleManager().startAll();
  }

  async stopAll(): Promise<void> {
    await getMcpLifecycleManager().stopAll();
  }

  async executeTool(serverName: string, toolName: string, input?: unknown): Promise<unknown> {
    return getMcpLifecycleManager().executeTool(serverName, toolName, input);
  }

  async renderPrompt(serverName: string, promptName: string, input?: unknown): Promise<unknown> {
    return getMcpLifecycleManager().renderPrompt(serverName, promptName, input);
  }

  async readResource(serverName: string, uriTemplate: string, input?: unknown): Promise<unknown> {
    return getMcpLifecycleManager().readResource(serverName, uriTemplate, input);
  }
}
