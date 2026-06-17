export type MsgHeader = { name?: string; value?: string };

export type EmailMsg = {
  id?: string | null;
  labelIds?: string[] | null;
  snippet?: string | null;
  internalDate?: string | null;
  payload?: { headers?: MsgHeader[] | null } | null;
};

export type Sender = { name: string; email: string; count: number };
