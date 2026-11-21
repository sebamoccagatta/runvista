import type { PrismaClient } from '../../generated/prisma/client.js';

import {
  createRunSchema,
  updateRunSchema,
  type CreateRunInput,
  type UpdateRunInput,
} from './run.schemas.js';

export class RunService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(actorId: string, input: CreateRunInput) {
    const data = createRunSchema.parse(input);

    return this.prisma.$transaction(async (tx) => {
      const run = await tx.run.create({
        data: {
          title: data.title,
          ...(data.description !== undefined && {
            description: data.description,
          }),
          status: 'DRAFT',
          ownerId: actorId,
        },
      });

      await tx.runParticipant.create({
        data: {
          runId: run.id,
          userId: actorId,
          role: 'OWNER',
        },
      });

      return run;
    });
  }

  async list(actorId: string) {
    return this.prisma.run.findMany({
      where: {
        ownerId: actorId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 50,
    });
  }

  async getById(actorId: string, runId: string) {
    return this.prisma.run.findFirst({
      where: {
        id: runId,
        ownerId: actorId,
      },
    });
  }

  async update(actorId: string, runId: string, input: UpdateRunInput) {
    const data = updateRunSchema.parse(input);

    const result = await this.prisma.run.updateMany({
      where: {
        id: runId,
        ownerId: actorId,
      },
      data: {
        ...(data.title !== undefined && {
          title: data.title,
        }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.status !== undefined && {
          status: data.status,
        }),
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.getById(actorId, runId);
  }

  async remove(actorId: string, runId: string) {
    const result = await this.prisma.run.deleteMany({
      where: {
        id: runId,
        ownerId: actorId,
      },
    });

    return result.count > 0;
  }
}
