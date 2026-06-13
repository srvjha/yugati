import 'server-only';

import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { headers } from 'next/headers';
import { cache } from 'react';
import { appRouter }     from '../routers/_app';
import { createContext } from '../trpc';
import { makeQueryClient } from '../query-client';

// cache() memoises the QueryClient to one instance per server request.
export const getQueryClient = cache(makeQueryClient);

// Server-side tRPC proxy — use in Server Components to prefetch or read data.
// Never import this in client components; use useTRPC() from client/index.ts instead.
export const trpc = createTRPCOptionsProxy({
  router: appRouter,
  ctx: async () => createContext({ headers: await headers() }),
  queryClient: getQueryClient,
});
