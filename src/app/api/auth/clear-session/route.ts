import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// POST-only: clears a stale session cookie (e.g. after a DB wipe in dev).
// POST prevents CSRF prefetch/forged-request exploitation.
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('better-auth.session_token');
  return NextResponse.json({ ok: true });
}
