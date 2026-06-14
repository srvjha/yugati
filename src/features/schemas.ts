import { z } from 'zod';

export const idSchema = z.string().min(1, 'ID cannot be empty').trim();

export const emailSchema = z.string().email('Must be a valid email').toLowerCase().trim();

export const isoDateTimeSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
    'Must be ISO 8601 datetime e.g. 2024-01-15T10:00:00Z',
  )
  .trim();

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date in YYYY-MM-DD format')
  .trim();
