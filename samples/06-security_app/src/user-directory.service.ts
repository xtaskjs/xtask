import { Service } from "@xtaskjs/core";

export interface DemoUser {
  id: string;
  name: string;
  roles: string[];
  active: boolean;
}

@Service()
export class UserDirectoryService {
  private readonly users = new Map<string, DemoUser>([
    [
      "admin",
      {
        id: "admin",
        name: "Ada Admin",
        roles: ["admin", "user"],
        active: true,
      },
    ],
    [
      "viewer",
      {
        id: "viewer",
        name: "Victor Viewer",
        roles: ["user"],
        active: true,
      },
    ],
  ]);

  findActiveUser(id: string): DemoUser | undefined {
    const user = this.users.get(id);
    if (!user || !user.active) {
      return undefined;
    }
    return user;
  }

  listUsers(): DemoUser[] {
    return Array.from(this.users.values());
  }
}