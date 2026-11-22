import { describe, expect, it } from 'vitest';

import {
  generateSession,
  hashSessionToken,
  isSessionExpired,
  isValidSessionToken,
  SESSION_DURATION_MS,
} from './auth.session.js';

describe('Runvista sessions', () => {
  it('generates a cryptographically random token', () => {
    const session = generateSession();

    expect(session.token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates unique session tokens', () => {
    const first = generateSession();
    const second = generateSession();

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it('stores a hash different from the original token', () => {
    const session = generateSession();

    expect(session.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(session.tokenHash).not.toBe(session.token);
    expect(hashSessionToken(session.token)).toBe(session.tokenHash);
  });

  it('rejects malformed tokens', () => {
    expect(() => hashSessionToken('invalid')).toThrow('Invalid session token');

    expect(isValidSessionToken('invalid')).toBe(false);
    expect(isValidSessionToken(null)).toBe(false);
    expect(isValidSessionToken('a'.repeat(64))).toBe(true);
  });

  it('sets a seven-day expiration date', () => {
    const now = new Date('2026-11-21T12:00:00.000Z');

    const session = generateSession(now);

    expect(session.expiresAt.getTime()).toBe(now.getTime() + SESSION_DURATION_MS);
  });

  it('identifies expired and active sessions', () => {
    const now = new Date('2026-11-21T12:00:00.000Z');

    expect(isSessionExpired(new Date('2026-11-20T12:00:00.000Z'), now)).toBe(true);

    expect(isSessionExpired(now, now)).toBe(true);

    expect(isSessionExpired(new Date('2026-11-22T12:00:00.000Z'), now)).toBe(false);
  });
});
