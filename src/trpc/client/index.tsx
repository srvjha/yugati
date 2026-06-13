'use client';

import 'client-only';

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { makeQueryClient } from '../query-client';
import type { AppRouter } from '../types';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

// Singleton on the browser — avoids recreating on every render.
let browserQueryClient: ReturnType<typeof makeQueryClient> | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

// Client factory — creates the tRPC HTTP client once per provider mount.
function createTRPCReactClient() {
  return createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: `${getBaseUrl()}/api/trpc` })],
  });
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(createTRPCReactClient);

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
