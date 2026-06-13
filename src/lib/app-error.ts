export class AppError extends Error {
  constructor(
    readonly message: string,
    readonly status: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }

  toResponse() {
    return Response.json({ error: this.message }, { status: this.status });
  }

  static notFound(msg = "Not found") { return new AppError(msg, 404); }
  static unauthorized(msg = "Unauthorized") { return new AppError(msg, 401); }
  static forbidden(msg = "Forbidden") { return new AppError(msg, 403); }
  static badRequest(msg = "Bad request") { return new AppError(msg, 400); }
}
