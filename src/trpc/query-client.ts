import { QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';

// Factory — always call this instead of new QueryClient() directly so
// dehydration config stays consistent between server and client.
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
    },
  });
}
