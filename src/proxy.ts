import { NextResponse, type NextRequest } from 'next/server';

// Better Auth sets this cookie after a successful sign-in.
const SESSION_COOKIE = 'better-auth.session_token';

// Routes that require a session. Everything else is public.
const PROTECTED_PREFIXES = ['/dashboard'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // Unauthenticated user hitting a protected route → send to sign-in.
  if (!hasSession && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Already signed-in user hitting the sign-in page → send to dashboard.
  if (hasSession && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
