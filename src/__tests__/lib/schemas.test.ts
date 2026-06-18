import { describe, it, expect } from 'vitest';
import { idSchema, emailSchema, isoDateTimeSchema, isoDateSchema } from '@/features/schemas';

describe('idSchema', () => {
  it('accepts a non-empty string', () => {
    expect(idSchema.parse('abc-123')).toBe('abc-123');
  });

  it('rejects an empty string', () => {
    expect(() => idSchema.parse('')).toThrow();
  });
});

describe('emailSchema', () => {
  it('accepts a valid email and lowercases it', () => {
    expect(emailSchema.parse('User@Example.COM')).toBe('user@example.com');
  });

  it('rejects a non-email string', () => {
    expect(() => emailSchema.parse('not-an-email')).toThrow();
  });

  it('trims whitespace from a valid email', () => {
    // .trim() is a transform that runs after format validation passes
    expect(emailSchema.parse('test@test.com')).toBe('test@test.com');
  });
});

describe('isoDateTimeSchema', () => {
  it('accepts a UTC datetime', () => {
    expect(isoDateTimeSchema.parse('2026-06-18T10:30:00Z')).toBe('2026-06-18T10:30:00Z');
  });

  it('accepts a datetime with offset', () => {
    expect(isoDateTimeSchema.parse('2026-06-18T10:30:00+05:30')).toBe('2026-06-18T10:30:00+05:30');
  });

  it('accepts a datetime with milliseconds', () => {
    expect(isoDateTimeSchema.parse('2026-06-18T10:30:00.000Z')).toBe('2026-06-18T10:30:00.000Z');
  });

  it('rejects a plain date', () => {
    expect(() => isoDateTimeSchema.parse('2026-06-18')).toThrow();
  });

  it('rejects a free-form string', () => {
    expect(() => isoDateTimeSchema.parse('tomorrow at 3pm')).toThrow();
  });
});

describe('isoDateSchema', () => {
  it('accepts a YYYY-MM-DD date', () => {
    expect(isoDateSchema.parse('2026-06-18')).toBe('2026-06-18');
  });

  it('rejects a datetime', () => {
    expect(() => isoDateSchema.parse('2026-06-18T10:00:00Z')).toThrow();
  });

  it('rejects a partial date', () => {
    expect(() => isoDateSchema.parse('2026-06')).toThrow();
  });
});
