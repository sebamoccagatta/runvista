import type { DatabaseClient } from '../../db/prisma.js';
import type { TwitchUser } from './twitch.user.js';

export interface AuthenticatedUser {
  id: string;
  twitchId: string;
  displayName: string;
}

export class AuthUserService {
  constructor(private readonly prisma: DatabaseClient) {}

  async findOrCreateFromTwitch(twitchUser: TwitchUser): Promise<AuthenticatedUser> {
    const twitchId = twitchUser.id.trim();
    const displayName = twitchUser.displayName.trim();

    if (!twitchId || !displayName) {
      throw new Error('Invalid Twitch user identity');
    }

    const user = await this.prisma.user.upsert({
      where: {
        twitchId,
      },
      create: {
        twitchId,
        displayName,
      },
      update: {
        displayName,
      },
      select: {
        id: true,
        twitchId: true,
        displayName: true,
      },
    });

    if (!user.twitchId) {
      throw new Error('User has no Twitch identity');
    }

    return {
      id: user.id,
      twitchId: user.twitchId,
      displayName: user.displayName,
    };
  }
}
