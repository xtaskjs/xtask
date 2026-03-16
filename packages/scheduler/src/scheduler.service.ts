import { getSchedulerLifecycleManager } from "./lifecycle";
import { SchedulerJobSummary } from "./types";

export class SchedulerService {
  listJobs(group?: string): SchedulerJobSummary[] {
    return getSchedulerLifecycleManager().listJobs(group);
  }

  listGroups(): string[] {
    return getSchedulerLifecycleManager().listGroups();
  }

  isStarted(): boolean {
    return getSchedulerLifecycleManager().isStarted();
  }

  async startAll(): Promise<void> {
    await getSchedulerLifecycleManager().startAll();
  }

  async stopAll(): Promise<void> {
    await getSchedulerLifecycleManager().stopAll();
  }

  async startGroup(group: string): Promise<void> {
    await getSchedulerLifecycleManager().startGroup(group);
  }

  async stopGroup(group: string): Promise<void> {
    await getSchedulerLifecycleManager().stopGroup(group);
  }

  async runGroup(group: string): Promise<void> {
    await getSchedulerLifecycleManager().runGroup(group);
  }

  async startJob(name: string): Promise<void> {
    await getSchedulerLifecycleManager().startJob(name);
  }

  async stopJob(name: string): Promise<void> {
    await getSchedulerLifecycleManager().stopJob(name);
  }

  async runJob(name: string): Promise<void> {
    await getSchedulerLifecycleManager().runJob(name);
  }
}