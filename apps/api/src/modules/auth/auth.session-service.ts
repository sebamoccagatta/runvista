import type { DatabaseClient } from '../../db/prisma.js';
import { generateSession, hashSessionToken, isValidSessionToken } from './auth.session.js';

export interface SessionUser {
  id: string;
  displayName: string;
  twitchId: string | null;
}

export class AuthSessionService {
  constructor(private readonly prisma: DatabaseClient) {}

  async create(userId: string): Promise<string> {
    const session = generateSession();

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: session.tokenHash,
        expiresAt: session.expiresAt,
      },
    });

    // Solo el navegador recibirá este token original.
    // PostgreSQL conserva únicamente su hash.
    return session.token;
  }

  async resolveUser(token: unknown): Promise<SessionUser | null> {
    if (!isValidSessionToken(token)) {
      return null;
    }

    const session = await this.prisma.session.findFirst({
      where: {
        tokenHash: hashSessionToken(token),
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        user: {
          select: {
            id: true,
            displayName: true,
            twitchId: true,
          },
        },
      },
    });

    return session?.user ?? null;
  }

  async revoke(token: unknown): Promise<boolean> {
    if (!isValidSessionToken(token)) {
      return false;
    }

    const result = await this.prisma.session.updateMany({
      where: {
        tokenHash: hashSessionToken(token),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count > 0;
  }
}
