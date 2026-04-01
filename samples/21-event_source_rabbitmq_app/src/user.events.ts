export class UserRegisteredEvent {
  constructor(
    public readonly id: string,
    public readonly displayName: string,
    public readonly email: string,
    public readonly registeredAt: Date
  ) {}
}

export class UserEmailVerifiedEvent {
  constructor(
    public readonly id: string,
    public readonly verifiedAt: Date
  ) {}
}