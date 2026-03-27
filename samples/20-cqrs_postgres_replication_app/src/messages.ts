export class CreateUserCommand {
  constructor(
    public readonly displayName: string,
    public readonly email: string,
    public readonly requestId?: string
  ) {}
}

export class RenameUserCommand {
  constructor(
    public readonly id: number,
    public readonly displayName: string,
    public readonly requestId?: string
  ) {}
}

export class MarkUserOnboardedCommand {
  constructor(public readonly id: number) {}
}

export class ListUsersQuery {}

export class InspectReplicationStateQuery {}

export class UserCreatedEvent {
  constructor(
    public readonly id: number,
    public readonly displayName: string,
    public readonly email: string,
    public readonly createdAt: Date
  ) {}
}

export class UserRenamedEvent {
  constructor(
    public readonly id: number,
    public readonly displayName: string
  ) {}
}