export type TRPCContext = {
  tenantId: string | null;
  headers: Headers;
};

export type TRPCProtectedContext = TRPCContext & {
  tenantId: string;
};

export type { AppRouter } from './routers/_app';
