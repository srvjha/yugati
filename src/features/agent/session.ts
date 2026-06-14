import { MemorySession } from '@openai/agents';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { chatSessions } from '@/server/db/schema';

export async function loadSession(userId: string, conversationId?: string) {
  const id = conversationId ?? randomUUID();

  let initialItems: unknown[] = [];
  if (conversationId) {
    const [row] = await db
      .select({ items: chatSessions.items })
      .from(chatSessions)
      .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)))
      .limit(1);
    initialItems = (row?.items as unknown[]) ?? [];
  }

  // MemorySession holds items in memory for this request; we hydrate it from the DB.
  const session = new MemorySession({
    sessionId:    id,
    initialItems: initialItems as Parameters<typeof MemorySession.prototype.addItems>[0],
  });

  return { session, id };
}

export async function saveSession(userId: string, id: string, session: MemorySession) {
  const items = await session.getItems();
  await db
    .insert(chatSessions)
    .values({ id, userId, items })
    .onConflictDoUpdate({
      target:  chatSessions.id,
      set:     { items, updatedAt: new Date() },
    });
}
