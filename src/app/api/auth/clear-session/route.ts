import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Clears a stale session cookie that exists in the browser but no longer has
// a matching row in the database (e.g. after a DB wipe in development).
// Redirecting here from a Server Component layout avoids the Next.js restriction
// that cookies can only be mutated in Route Handlers or Server Actions.
export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete('better-auth.session_token');
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
}
