import { initTRPC, TRPCError } from '@trpc/server';
import type { TRPCContext, TRPCProtectedContext } from './types';

// Context factory — called once per request by the handler.
export function createContext(opts: { headers: Headers }): TRPCContext {
  return {
    tenantId: opts.headers.get('x-tenant-id'),
    headers: opts.headers,
  };
}

// tRPC instance factory — called once at module load, never directly accessed outside this file.
function createTRPC() {
  const t = initTRPC.context<TRPCContext>().create();

  const enforceAuth = t.middleware(({ ctx, next }) => {
    if (!ctx.tenantId) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
    }
    return next({ ctx: ctx as TRPCProtectedContext });
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

export const createTRPCRouter    = t.router;
export const publicProcedure     = t.publicProcedure;
export const protectedProcedure  = t.protectedProcedure;
export const createCallerFactory = t.createCallerFactory;
export const mergeRouters        = t.mergeRouters;
