import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter }    from './routers/_app';
import { createContext } from './trpc';
import { initCorsair }  from '@/server/corsair-setup';

export function createTRPCHandler() {
  return (req: Request) =>
    initCorsair().then(() =>
      fetchRequestHandler({
        endpoint: '/api/trpc',
        req,
        router: appRouter,
        createContext: () => createContext({ headers: req.headers }),
        onError: ({ error, path }) => {
          // Only log unexpected errors — auth errors are handled by the middleware.
          if (error.code === 'INTERNAL_SERVER_ERROR') {
            console.error(`[tRPC] ${path}:`, error.message, error.cause);
          }
        },
      }),
    );
}
