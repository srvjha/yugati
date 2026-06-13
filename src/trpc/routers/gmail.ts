import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { GmailService } from '@/server/services/gmail.service';

const id = z.object({ id: z.string() });

export const gmailRouter = createTRPCRouter({

  // ─── Messages ──────────────────────────────────────────────────────────────

  listMessages: protectedProcedure
    .input(z.object({ q: z.string().optional(), maxResults: z.number().optional(), labelIds: z.array(z.string()).optional() }).optional())
    .query(({ ctx, input }) => new GmailService(ctx.tenantId).listMessages(input ?? {})),

  getMessage: protectedProcedure
    .input(id)
    .query(({ ctx, input }) => new GmailService(ctx.tenantId).getMessage(input.id)),

  sendMessage: protectedProcedure
    .input(z.object({
      to: z.array(z.string()),
      cc: z.array(z.string()).optional(),
      bcc: z.array(z.string()).optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
      htmlBody: z.string().optional(),
      threadId: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).sendMessage(input)),

  trashMessage: protectedProcedure
    .input(id)
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).trashMessage(input.id)),

  modifyMessage: protectedProcedure
    .input(z.object({ id: z.string(), addLabelIds: z.array(z.string()).optional(), removeLabelIds: z.array(z.string()).optional() }))
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).modifyMessage(input.id, input)),

  batchModifyMessages: protectedProcedure
    .input(z.object({ ids: z.array(z.string()), addLabelIds: z.array(z.string()).optional(), removeLabelIds: z.array(z.string()).optional() }))
    .mutation(({ ctx, input }) => {
      const svc = new GmailService(ctx.tenantId);
      return Promise.all(input.ids.map((id) => svc.modifyMessage(id, input)));
    }),

  // ─── Threads ───────────────────────────────────────────────────────────────

  listThreads: protectedProcedure
    .input(z.object({ q: z.string().optional(), maxResults: z.number().optional(), labelIds: z.array(z.string()).optional() }).optional())
    .query(({ ctx, input }) => new GmailService(ctx.tenantId).listThreads(input ?? {})),

  getThread: protectedProcedure
    .input(id)
    .query(({ ctx, input }) => new GmailService(ctx.tenantId).getThread(input.id)),

  trashThread: protectedProcedure
    .input(id)
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).trashThread(input.id)),

  modifyThread: protectedProcedure
    .input(z.object({ id: z.string(), addLabelIds: z.array(z.string()).optional(), removeLabelIds: z.array(z.string()).optional() }))
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).modifyMessage(input.id, input)),

  // ─── Drafts ────────────────────────────────────────────────────────────────

  createDraft: protectedProcedure
    .input(z.object({
      to: z.array(z.string()).optional(),
      cc: z.array(z.string()).optional(),
      bcc: z.array(z.string()).optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
      htmlBody: z.string().optional(),
      threadId: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).createDraft(input)),

  updateDraft: protectedProcedure
    .input(z.object({ id: z.string(), to: z.array(z.string()).optional(), subject: z.string().optional(), body: z.string().optional() }))
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).updateDraft(input.id, input)),

  sendDraft: protectedProcedure
    .input(id)
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).sendDraft(input.id)),

  getDraft: protectedProcedure
    .input(id)
    .query(({ ctx, input }) => new GmailService(ctx.tenantId).getDraft(input.id)),

  listDrafts: protectedProcedure
    .input(z.object({ maxResults: z.number().optional() }).optional())
    .query(({ ctx, input }) => new GmailService(ctx.tenantId).listMessages({ labelIds: ['DRAFT'], maxResults: input?.maxResults })),

  // ─── Labels ────────────────────────────────────────────────────────────────

  listLabels: protectedProcedure
    .query(({ ctx }) => new GmailService(ctx.tenantId).listLabels()),

  createLabel: protectedProcedure
    .input(z.object({ name: z.string(), labelListVisibility: z.string().optional(), messageListVisibility: z.string().optional() }))
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).createLabel(input)),

  updateLabel: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().optional(), labelListVisibility: z.string().optional(), messageListVisibility: z.string().optional() }))
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).updateLabel(input.id, input)),

  deleteLabel: protectedProcedure
    .input(id)
    .mutation(({ ctx, input }) => new GmailService(ctx.tenantId).deleteLabel(input.id)),

});
