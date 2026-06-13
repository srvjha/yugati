import { createTRPCHandler } from '@/trpc/handler';

const handler = createTRPCHandler();

export { handler as GET, handler as POST };
