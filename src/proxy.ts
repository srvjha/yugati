import { NextResponse, type NextRequest } from "next/server";

// Global proxy — runs before every matched route.
// Responsibility: read session cookie → verify → inject x-tenant-id header for route handlers.
// Route handlers still call getRequiredTenantId() themselves; never rely on proxy alone for auth.
// TODO: replace the stub below with real session/JWT verification once auth is implemented.

export function proxy(request: NextRequest) {
  // Stub: in production, read and verify a session cookie/JWT here,
  // then inject the verified tenant ID so downstream handlers can trust it.
  const sessionTenantId = request.cookies.get("session")?.value;

  if (!sessionTenantId && request.nextUrl.pathname.startsWith("/api/")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headers = new Headers(request.headers);
  if (sessionTenantId) {
    headers.set("x-tenant-id", sessionTenantId);
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
