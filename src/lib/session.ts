import { AppError } from "./app-error";

// Reads the tenant ID injected by proxy.ts after session verification.
// TODO: replace with real session/JWT logic once auth is implemented.
export function getRequiredTenantId(request: Request): string {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId) throw AppError.unauthorized();
  return tenantId;
}
