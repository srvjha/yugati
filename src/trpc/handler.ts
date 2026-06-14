import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter }    from './routers/_app';
import { createContext } from './trpc';
import { initCorsair }  from '@/server/corsair';

export function createTRPCHandler() {
  return (req: Request) =>
    initCorsair().then(() =>
      fetchRequestHandler({
        endpoint: '/api/trpc',
        req,
        router: appRouter,
        createContext: () => createContext({ headers: req.headers }),
        onError: ({ error, path }) => {
          if (error.code === 'INTERNAL_SERVER_ERROR') {
            console.error(`[tRPC] ${path}:`, error.message, error.cause);
          }
        },
      }),
    );
}
