import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export function generateOverlayToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

export function isValidOverlayToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_PATTERN.test(token);
}

export function hashOverlayToken(token: string): string {
  if (!isValidOverlayToken(token)) {
    throw new Error('Invalid overlay token');
  }

  return createHash('sha256').update(token, 'utf8').digest('hex');
}
