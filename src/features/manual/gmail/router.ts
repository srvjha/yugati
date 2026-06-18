import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/trpc/trpc';
import { GmailService } from './service';
import {
  ListMessagesSchema, GetMessageSchema, SendMessageSchema, TrashMessageSchema,
  ModifyMessageSchema, BatchModifySchema,
  ListThreadsSchema, GetThreadSchema, TrashThreadSchema, ModifyThreadSchema,
  CreateDraftSchema, UpdateDraftSchema, SendDraftSchema, GetDraftSchema,
  CreateLabelSchema, UpdateLabelSchema,
} from './schema';
import { idSchema } from '@/features/schemas';

export const gmailRouter = createTRPCRouter({

  // ─── Messages ──────────────────────────────────────────────────────────────

  listMessages: protectedProcedure
    .input(ListMessagesSchema)
    .query(({ ctx, input }) => new GmailService(ctx.tenantId).listMessages(input)),

  listInbox: protectedProcedure
    .input(z.object({
      maxResults: z.number().int().min(1).max(100).default(20),
      q:          z.string().optional(),
    }).optional())
    .query(({ ctx, input }) => new GmailService(ctx.tenantId).listInbox(input ?? {})),

  getMessage: protectedProcedure
    .input(GetMessageSchema)
    .query(({ ctx, input }) => new GmailService(ctx.tenantId).getMessage(input.id)),

  sendMessage: protectedProcedure
    .input(SendMessageSchema)
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).sendMessage(input)),

  trashMessage: protectedProcedure
    .input(TrashMessageSchema)
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).trashMessage(input.id)),

  modifyMessage: protectedProcedure
    .input(ModifyMessageSchema)
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).modifyMessage(input.id, input)),

  batchModifyMessages: protectedProcedure
    .input(BatchModifySchema)
    .mutation(({ ctx, input }) => {
      const svc = new GmailService(ctx.tenantId);
      return Promise.all(input.ids.map((id) => svc.modifyMessage(id, input)));
    }),

  // ─── Threads ───────────────────────────────────────────────────────────────

  listThreads: protectedProcedure
    .input(ListThreadsSchema)
    .query(({ ctx, input }) => new GmailService(ctx.tenantId).listThreads(input)),

  getThread: protectedProcedure
    .input(GetThreadSchema)
    .query(({ ctx, input }) => new GmailService(ctx.tenantId).getThread(input.id)),

  trashThread: protectedProcedure
    .input(TrashThreadSchema)
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).trashThread(input.id)),

  modifyThread: protectedProcedure
    .input(ModifyThreadSchema)
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).modifyMessage(input.id, input)),

  // ─── Drafts ────────────────────────────────────────────────────────────────

  createDraft: protectedProcedure
    .input(CreateDraftSchema)
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).createDraft(input)),

  updateDraft: protectedProcedure
    .input(UpdateDraftSchema)
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).updateDraft(input.id, input)),

  sendDraft: protectedProcedure
    .input(SendDraftSchema)
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).sendDraft(input.id)),

  getDraft: protectedProcedure
    .input(GetDraftSchema)
    .query(({ ctx, input }) => new GmailService(ctx.tenantId).getDraft(input.id)),

  listDrafts: protectedProcedure
    .input(z.object({ maxResults: z.number().int().min(1).max(500).default(20) }).optional())
    .query(({ ctx, input }) =>
      new GmailService(ctx.tenantId).listMessages({ labelIds: ['DRAFT'], maxResults: input?.maxResults })
    ),

  // ─── Labels ────────────────────────────────────────────────────────────────

  listLabels: protectedProcedure
    .query(({ ctx }) => new GmailService(ctx.tenantId).listLabels()),

  createLabel: protectedProcedure
    .input(CreateLabelSchema)
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).createLabel(input)),

  updateLabel: protectedProcedure
    .input(UpdateLabelSchema)
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).updateLabel(input.id, input)),

  deleteLabel: protectedProcedure
    .input(z.object({ id: idSchema }))
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).deleteLabel(input.id)),

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  listSubscriptions: protectedProcedure
    .input(z.object({ maxResults: z.number().int().min(1).max(150).default(50) }).optional())
    .query(({ ctx, input }) => new GmailService(ctx.tenantId).listSubscriptions(input?.maxResults)),

  unsubscribeViaEmail: protectedProcedure
    .input(z.object({ mailtoUrl: z.string().startsWith('mailto:').max(2000) }))
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).unsubscribeViaEmail(input.mailtoUrl)),

});
