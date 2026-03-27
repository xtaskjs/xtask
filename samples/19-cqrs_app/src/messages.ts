export class CreateUserCommand {
  constructor(
    public readonly displayName: string,
    public readonly email: string,
    public readonly requestId?: string
  ) {}
}

export class ListUsersQuery {}

export class InspectCqrsStateQuery {}

export class MarkUserOnboardedCommand {
  constructor(public readonly id: number) {}
}

export class UserCreatedEvent {
  constructor(
    public readonly id: number,
    public readonly displayName: string,
    public readonly email: string,
    public readonly createdAt: Date
  ) {}
}