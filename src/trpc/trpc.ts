import { initTRPC, TRPCError } from '@trpc/server';
import { AuthMissingError } from 'corsair';
import { auth } from '@/lib/auth';
import type { TRPCContext, TRPCProtectedContext } from './types';

// Catches both AuthMissingError and plain "Account not found" errors thrown when
// a tenant has no Corsair account row yet (i.e. they haven't connected the plugin).
function isNotConnected(err: unknown): boolean {
  if (err == null) return false;
  const msg: string = (err as Record<string, unknown>)?.message as string ?? '';
  if (err instanceof AuthMissingError) return true;
  if ((err as Record<string, unknown>)?.constructor?.name === 'AuthMissingError') return true;
  if (typeof err === 'object' && 'pluginId' in (err as object)) return true;
  if (String(msg).includes('Account not found')) return true;
  if (String(msg).includes('not connected')) return true;
  return false;
}

function extractPlugin(err: unknown): string {
  const msg = String((err as Record<string, unknown>)?.message ?? '');
  const match = msg.match(/integration "([^"]+)"/);
  return match?.[1] ?? 'plugin';
}

// Context factory — called once per request by the handler.
// Reads the Better Auth session to get the userId which doubles as the Corsair tenantId.
export async function createContext(opts: { headers: Headers }): Promise<TRPCContext> {
  const session = await auth.api.getSession({ headers: opts.headers });
  return {
    tenantId: session?.user.id ?? null,
    headers: opts.headers,
  };
}

// tRPC instance factory — called once at module load, never directly accessed outside this file.
function createTRPC() {
  const t = initTRPC.context<TRPCContext>().create();

  const enforceAuth = t.middleware(async ({ ctx, next }) => {
    if (!ctx.tenantId) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
    }
    // In tRPC v11, next() returns { ok, error } — it does NOT throw on downstream errors.
    const result = await next({ ctx: ctx as TRPCProtectedContext });
    if (!result.ok) {
      // Check both the TRPCError and its cause (the original Corsair error).
      const cause = (result.error as TRPCError & { cause?: unknown }).cause ?? result.error;
      if (isNotConnected(cause) || isNotConnected(result.error)) {
        const pluginId = extractPlugin(cause) || extractPlugin(result.error);
        throw new TRPCError({ code: 'UNAUTHORIZED', message: `${pluginId} not connected`, cause });
      }
    }
    return result;
  });

  return {
    router: t.router,
    publicProcedure: t.procedure,
    protectedProcedure: t.procedure.use(enforceAuth),
    createCallerFactory: t.createCallerFactory,
    mergeRouters: t.mergeRouters,
  };
}

const t = createTRPC();

export const createTRPCRouter   = t.router;
export const protectedProcedure = t.protectedProcedure;
