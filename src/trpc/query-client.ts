import { QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';

// Factory — always call this instead of new QueryClient() directly so
// dehydration config stays consistent between server and client.
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        // Don't retry on auth errors — the plugin isn't connected yet.
        retry: (count, err: unknown) => {
          const code = (err as { data?: { code?: string } })?.data?.code;
          if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN') return false;
          return count < 3;
        },
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
    },
  });
}
