import { z } from 'zod';
import { emailSchema, idSchema } from './common';

// ─── List messages ─────────────────────────────────────────────────────────────
// q is Gmail search syntax: "from:me", "is:unread", etc.
// maxResults capped at 500 — Gmail API hard limit.

export const ListMessagesSchema = z.object({
  q:                z.string().max(500, 'Search query too long').trim().optional(),
  labelIds:         z.array(z.string().min(1)).optional(),
  maxResults:       z.number().int().min(1).max(500).default(20),
  pageToken:        z.string().optional(),
  includeSpamTrash: z.boolean().default(false),
});

// ─── Get / trash a single message ─────────────────────────────────────────────

export const GetMessageSchema = z.object({
  id: idSchema,
});

export const TrashMessageSchema = z.object({
  id: idSchema,
});

// ─── Send message ──────────────────────────────────────────────────────────────
// `to` must have at least 1 recipient — sending to nobody is always a bug.
// subject max 998 chars comes from RFC 2822.

export const SendMessageSchema = z.object({
  to:       z.array(emailSchema).min(1, 'At least one recipient required'),
  cc:       z.array(emailSchema).optional(),
  bcc:      z.array(emailSchema).optional(),
  subject:  z.string().max(998, 'Subject exceeds RFC 2822 limit').optional(),
  body:     z.string().optional(),
  htmlBody: z.string().optional(),
  threadId: z.string().optional(),
});

// ─── Modify message labels ─────────────────────────────────────────────────────
// Both arrays are optional but at least one must be non-empty — otherwise the
// call does nothing and that is almost always a client bug.

export const ModifyMessageSchema = z
  .object({
    id:             idSchema,
    addLabelIds:    z.array(z.string()).optional(),
    removeLabelIds: z.array(z.string()).optional(),
  })
  .refine(
    (d) => (d.addLabelIds?.length ?? 0) + (d.removeLabelIds?.length ?? 0) > 0,
    { message: 'Provide at least one label to add or remove' },
  );

// ─── Batch modify ──────────────────────────────────────────────────────────────

export const BatchModifySchema = z
  .object({
    ids:            z.array(idSchema).min(1).max(1000, 'Max 1000 messages per batch'),
    addLabelIds:    z.array(z.string()).optional(),
    removeLabelIds: z.array(z.string()).optional(),
  })
  .refine(
    (d) => (d.addLabelIds?.length ?? 0) + (d.removeLabelIds?.length ?? 0) > 0,
    { message: 'Provide at least one label to add or remove' },
  );

// ─── Threads ───────────────────────────────────────────────────────────────────

export const ListThreadsSchema = z.object({
  q:                z.string().max(500).trim().optional(),
  labelIds:         z.array(z.string().min(1)).optional(),
  maxResults:       z.number().int().min(1).max(500).default(20),
  pageToken:        z.string().optional(),
  includeSpamTrash: z.boolean().default(false),
});

export const GetThreadSchema     = z.object({ id: idSchema });
export const TrashThreadSchema   = z.object({ id: idSchema });

export const ModifyThreadSchema = z
  .object({
    id:             idSchema,
    addLabelIds:    z.array(z.string()).optional(),
    removeLabelIds: z.array(z.string()).optional(),
  })
  .refine(
    (d) => (d.addLabelIds?.length ?? 0) + (d.removeLabelIds?.length ?? 0) > 0,
    { message: 'Provide at least one label to add or remove' },
  );

// ─── Drafts ────────────────────────────────────────────────────────────────────

export const CreateDraftSchema = z.object({
  to:       z.array(emailSchema).optional(),
  cc:       z.array(emailSchema).optional(),
  bcc:      z.array(emailSchema).optional(),
  subject:  z.string().max(998).optional(),
  body:     z.string().optional(),
  htmlBody: z.string().optional(),
  threadId: z.string().optional(),
});

export const UpdateDraftSchema = CreateDraftSchema.extend({ id: idSchema });
export const SendDraftSchema   = z.object({ id: idSchema });
export const GetDraftSchema    = z.object({ id: idSchema });

// ─── Labels ────────────────────────────────────────────────────────────────────
// Gmail label names have a 40-character limit enforced by the API.

export const CreateLabelSchema = z.object({
  name:                  z.string().min(1).max(40, 'Label name max 40 characters').trim(),
  labelListVisibility:   z.enum(['labelShow', 'labelShowIfUnread', 'labelHide']).optional(),
  messageListVisibility: z.enum(['show', 'hide']).optional(),
});

export const UpdateLabelSchema = CreateLabelSchema.partial().extend({ id: idSchema });

// ─── Inferred TypeScript types ─────────────────────────────────────────────────
// Import these in service files instead of writing the type by hand.

export type SendMessageInput  = z.infer<typeof SendMessageSchema>;
export type ModifyMessageInput = z.infer<typeof ModifyMessageSchema>;
export type ListMessagesInput = z.infer<typeof ListMessagesSchema>;
