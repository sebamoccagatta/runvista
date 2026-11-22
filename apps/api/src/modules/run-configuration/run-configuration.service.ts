import type { PrismaClient } from '../../generated/prisma/client.js';

import {
  saveRunConfigurationSchema,
  type SaveRunConfigurationInput,
} from './run-configuration.schemas.js';

export class RunConfigurationService {
  constructor(private readonly prisma: PrismaClient) {}

  async getByRunId(actorId: string, runId: string) {
    const run = await this.prisma.run.findFirst({
      where: {
        id: runId,
        ownerId: actorId,
      },
      select: {
        id: true,
      },
    });

    if (!run) {
      return {
        found: false as const,
      };
    }

    const configuration = await this.prisma.runConfiguration.findUnique({
      where: {
        runId,
      },
    });

    return {
      found: true as const,
      configuration,
    };
  }

  async save(actorId: string, runId: string, input: SaveRunConfigurationInput) {
    const data = saveRunConfigurationSchema.parse(input);

    return this.prisma.$transaction(async (tx) => {
      const run = await tx.run.findFirst({
        where: {
          id: runId,
          ownerId: actorId,
        },
        select: {
          id: true,
        },
      });

      if (!run) {
        return null;
      }

      return tx.runConfiguration.upsert({
        where: {
          runId,
        },
        create: {
          runId,
          gameId: data.gameId,
          challengeType: data.challengeType,
        },
        update: {
          gameId: data.gameId,
          challengeType: data.challengeType,
        },
      });
    });
  }
}
