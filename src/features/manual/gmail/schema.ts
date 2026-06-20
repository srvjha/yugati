import { z } from 'zod';
import { emailSchema, idSchema } from '@/features/schemas';

export const ListMessagesSchema = z.object({
  q:                z.string().max(500, 'Search query too long').trim().optional(),
  labelIds:         z.array(z.string().min(1)).optional(),
  maxResults:       z.number().int().min(1).max(500).default(20),
  pageToken:        z.string().optional(),
  includeSpamTrash: z.boolean().default(false),
});

export const GetMessageSchema   = z.object({ id: idSchema });
export const TrashMessageSchema = z.object({ id: idSchema });

const AttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  data:     z.string(),
  size:     z.number().int().positive(),
});

export const SendMessageSchema = z.object({
  to:          z.array(emailSchema).min(1, 'At least one recipient required'),
  cc:          z.array(emailSchema).optional(),
  bcc:         z.array(emailSchema).optional(),
  subject:     z.string().max(998, 'Subject exceeds RFC 2822 limit').optional(),
  body:        z.string().optional(),
  htmlBody:    z.string().optional(),
  threadId:    z.string().optional(),
  attachments: z.array(AttachmentSchema).max(25).optional(),
});

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

export const ListThreadsSchema = z.object({
  q:                z.string().max(500).trim().optional(),
  labelIds:         z.array(z.string().min(1)).optional(),
  maxResults:       z.number().int().min(1).max(500).default(20),
  pageToken:        z.string().optional(),
  includeSpamTrash: z.boolean().default(false),
});

export const GetThreadSchema   = z.object({ id: idSchema });
export const TrashThreadSchema = z.object({ id: idSchema });

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

export const CreateLabelSchema = z.object({
  name:                  z.string().min(1).max(40, 'Label name max 40 characters').trim(),
  labelListVisibility:   z.enum(['labelShow', 'labelShowIfUnread', 'labelHide']).optional(),
  messageListVisibility: z.enum(['show', 'hide']).optional(),
});

export const UpdateLabelSchema = CreateLabelSchema.partial().extend({ id: idSchema });

