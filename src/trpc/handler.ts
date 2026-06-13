import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter }    from './routers/_app';
import { createContext } from './trpc';

// Handler factory — keeps the route file a pure re-export with no configuration.
// Swap router or context logic here without touching app/api/trpc/[trpc]/route.ts.
export function createTRPCHandler() {
  return (req: Request) =>
    fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: () => createContext({ headers: req.headers }),
    });
}
