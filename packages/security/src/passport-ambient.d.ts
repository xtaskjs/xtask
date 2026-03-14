declare module "passport" {
  const passport: any;
  export = passport;
}

declare module "passport-jwt" {
  export const ExtractJwt: any;
  export class Strategy {
    constructor(options: any, verify: (...args: any[]) => void);
  }
}

declare module "passport-strategy" {
  export class Strategy {
    name: string;
    success(user: any, info?: any): void;
    fail(challenge?: any, status?: number): void;
    error(error: Error): void;
    pass(): void;
    authenticate(request: any, options?: any): void;
  }
}