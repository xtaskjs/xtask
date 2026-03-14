export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly payload?: any;

  constructor(statusCode: number, message: string, payload?: any) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized", payload?: any) {
    super(401, message, payload);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden", payload?: any) {
    super(403, message, payload);
    this.name = "ForbiddenError";
  }
}