import {
  calculateLevelCap,
  getGameBadges,
  isGameBadgeKey,
  type GameBadge,
} from '@runvista/pokemon/badges';

import type { PrismaClient } from '../../generated/prisma/client.js';

export interface RunBadgeView {
  key: string;
  name: string;
  leader: string;
  colors: GameBadge['colors'];
  /** Tope de nivel del juego con el aumento del run ya aplicado. */
  levelCap: number;
  obtained: boolean;
  obtainedAt: Date | null;
}

export type GetRunBadgesResult =
  | { found: false }
  | { found: true; configured: false }
  | {
      found: true;
      configured: true;
      gameId: string;
      levelCapIncrease: number;
      badges: RunBadgeView[];
    };

export type SetRunBadgeResult =
  | { status: 'RUN_NOT_FOUND' }
  | { status: 'CONFIGURATION_REQUIRED' }
  | { status: 'BADGE_NOT_AVAILABLE' }
  | { status: 'OK'; obtained: boolean; obtainedAt: Date | null };

export class RunBadgeService {
  constructor(private readonly prisma: PrismaClient) {}

  async getBadges(actorId: string, runId: string): Promise<GetRunBadgesResult> {
    const run = await this.prisma.run.findFirst({
      where: { id: runId, ownerId: actorId },
      select: {
        id: true,
        configuration: { select: { gameId: true, levelCapIncrease: true } },
      },
    });

    if (!run) {
      return { found: false };
    }

    if (!run.configuration) {
      return { found: true, configured: false };
    }

    const { gameId, levelCapIncrease } = run.configuration;

    const obtainedRows = await this.prisma.runBadge.findMany({
      where: { runId },
      select: { badgeKey: true, obtainedAt: true },
    });

    const obtainedAt = new Map(obtainedRows.map((row) => [row.badgeKey, row.obtainedAt]));

    const badges = getGameBadges(gameId).map((badge) => ({
      key: badge.key,
      name: badge.name,
      leader: badge.leader,
      colors: badge.colors,
      levelCap: calculateLevelCap(badge.levelCap, levelCapIncrease),
      obtained: obtainedAt.has(badge.key),
      obtainedAt: obtainedAt.get(badge.key) ?? null,
    }));

    return { found: true, configured: true, gameId, levelCapIncrease, badges };
  }

  async setBadge(
    actorId: string,
    runId: string,
    key: string,
    obtained: boolean,
  ): Promise<SetRunBadgeResult> {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.run.findFirst({
        where: { id: runId, ownerId: actorId },
        select: { configuration: { select: { gameId: true } } },
      });

      if (!run) {
        return { status: 'RUN_NOT_FOUND' as const };
      }

      if (!run.configuration) {
        return { status: 'CONFIGURATION_REQUIRED' as const };
      }

      if (!isGameBadgeKey(run.configuration.gameId, key)) {
        return { status: 'BADGE_NOT_AVAILABLE' as const };
      }

      if (!obtained) {
        await tx.runBadge.deleteMany({ where: { runId, badgeKey: key } });

        return { status: 'OK' as const, obtained: false, obtainedAt: null };
      }

      const row = await tx.runBadge.upsert({
        where: { runId_badgeKey: { runId, badgeKey: key } },
        create: { runId, badgeKey: key },
        update: {},
        select: { obtainedAt: true },
      });

      return { status: 'OK' as const, obtained: true, obtainedAt: row.obtainedAt };
    });
  }
}
