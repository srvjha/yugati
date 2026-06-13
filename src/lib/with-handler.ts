import { AuthMissingError } from "corsair";
import { AppError } from "./app-error";

// Decorator Pattern: wraps any route handler with centralised error handling.
// Catches AppError (domain errors), AuthMissingError (Corsair OAuth not connected),
// and unknown errors — so route handlers never need try/catch.
type RouteHandler = (request: Request, context?: unknown) => Promise<Response>;

export function withHandler(fn: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await fn(request, context);
    } catch (err) {
      if (err instanceof AppError) {
        return err.toResponse();
      }
      if (err instanceof AuthMissingError) {
        return Response.json(
          { error: "Google account not connected", plugin: err.pluginId },
          { status: 401 },
        );
      }
      console.error("[unhandled]", err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
