import { z } from 'zod';

// A non-empty string ID — reused anywhere an entity ID is expected.
// Why: empty string IDs would cause silent failures in the Google API.
export const idSchema = z.string().min(1, 'ID cannot be empty').trim();

// Email — lowercased so storage is always consistent.
// Why: "User@Gmail.com" and "user@gmail.com" are the same address.
export const emailSchema = z.string().email('Must be a valid email').toLowerCase().trim();

// ISO 8601 datetime — "2024-01-15T10:00:00Z" or "2024-01-15T10:00:00+05:30"
// Why: Google Calendar requires this exact format. Free-text dates would break silently.
export const isoDateTimeSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
    'Must be ISO 8601 datetime e.g. 2024-01-15T10:00:00Z',
  )
  .trim();

// ISO 8601 date-only — "2024-01-15" (used for all-day calendar events).
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date in YYYY-MM-DD format')
  .trim();
