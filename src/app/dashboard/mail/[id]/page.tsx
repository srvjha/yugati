import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { getQueryClient, trpc } from '@/trpc/server';
import { MailView } from '../../components/mail-view';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/trpc/types';

type GmailMessage = inferRouterOutputs<AppRouter>['gmail']['getMessage'];

export default async function MailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/');

  let message: GmailMessage | undefined;
  try {
    message = await getQueryClient().fetchQuery(
      trpc.gmail.getMessage.queryOptions({ id }),
    );
  } catch {
    // message stays undefined
  }

  if (!message) notFound();

  return <MailView message={message} />;
}
