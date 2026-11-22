import { createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE_NAME = 'runvista_session';

export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const SESSION_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export interface GeneratedSession {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export function hashSessionToken(token: string): string {
  if (!SESSION_TOKEN_PATTERN.test(token)) {
    throw new Error('Invalid session token');
  }

  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function generateSession(now: Date = new Date()): GeneratedSession {
  if (!Number.isFinite(now.getTime())) {
    throw new Error('Invalid session creation date');
  }

  const token = randomBytes(32).toString('hex');

  return {
    token,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
  };
}

export function isSessionExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function isValidSessionToken(token: unknown): token is string {
  return typeof token === 'string' && SESSION_TOKEN_PATTERN.test(token);
}
