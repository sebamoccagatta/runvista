import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';

import {
  createRunOverlaySchema,
  overlayLayoutSchema,
  updateRunOverlaySchema,
  type CreateRunOverlayInput,
  type UpdateRunOverlayInput,
} from './run-overlay.schemas.js';

import { generateOverlayToken, hashOverlayToken, isValidOverlayToken } from './overlay-token.js';

import { publishedTeamSchema } from '../run-pokemon/run-pokemon-publication.schemas.js';

export class OverlayNameConflictError extends Error {
  constructor() {
    super('An overlay with this name already exists in the run');
    this.name = 'OverlayNameConflictError';
  }
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

function toJsonValue(value: CreateRunOverlayInput['layout']): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

const overlaySelect = {
  id: true,
  runId: true,
  name: true,
  layout: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RunOverlaySelect;

export class RunOverlayService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(actorId: string, runId: string) {
    const run = await this.prisma.run.findFirst({
      where: { id: runId, ownerId: actorId },
      select: { id: true },
    });

    if (!run) {
      return { found: false as const };
    }

    const overlays = await this.prisma.runOverlay.findMany({
      where: { runId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: overlaySelect,
    });

    return {
      found: true as const,
      overlays,
    };
  }

  async getById(actorId: string, runId: string, overlayId: string) {
    return this.prisma.runOverlay.findFirst({
      where: {
        id: overlayId,
        runId,
        run: { ownerId: actorId },
      },
      select: overlaySelect,
    });
  }

  async create(actorId: string, runId: string, input: CreateRunOverlayInput) {
    const data = createRunOverlaySchema.parse(input);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const run = await tx.run.findFirst({
          where: { id: runId, ownerId: actorId },
          select: { id: true },
        });

        if (!run) {
          return { found: false as const };
        }

        const overlay = await tx.runOverlay.create({
          data: {
            runId,
            name: data.name,
            layout: toJsonValue(data.layout),
          },
          select: overlaySelect,
        });

        return {
          found: true as const,
          overlay,
        };
      });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new OverlayNameConflictError();
      }

      throw error;
    }
  }

  async update(actorId: string, runId: string, overlayId: string, input: UpdateRunOverlayInput) {
    const data = updateRunOverlaySchema.parse(input);

    try {
      const result = await this.prisma.runOverlay.updateMany({
        where: {
          id: overlayId,
          runId,
          run: { ownerId: actorId },
        },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.layout !== undefined && {
            layout: toJsonValue(data.layout),
          }),
        },
      });

      if (result.count === 0) {
        return null;
      }

      return this.getById(actorId, runId, overlayId);
    } catch (error) {
      if (isPrismaError(error, 'P2002')) {
        throw new OverlayNameConflictError();
      }

      throw error;
    }
  }

  async remove(actorId: string, runId: string, overlayId: string) {
    const result = await this.prisma.runOverlay.deleteMany({
      where: {
        id: overlayId,
        runId,
        run: { ownerId: actorId },
      },
    });

    return result.count > 0;
  }

  // Generar o renovar el acceso de solo lectura.
  // El propietario puede recuperar el token mediante el endpoint de acceso OBS.

  async issueObsToken(actorId: string, runId: string, overlayId: string) {
    const token = generateOverlayToken();

    const result = await this.prisma.runOverlay.updateMany({
      where: {
        id: overlayId,
        runId,
        run: { ownerId: actorId },
      },
      data: {
        obsPublicId: token,
        obsTokenHash: null,
      },
    });

    return result.count === 1 ? token : null;
  }

  // Invalidar el token anterior sin eliminar el diseño.

  async revokeObsToken(actorId: string, runId: string, overlayId: string) {
    const result = await this.prisma.runOverlay.updateMany({
      where: {
        id: overlayId,
        runId,
        run: { ownerId: actorId },
      },
      data: {
        obsPublicId: null,
        obsTokenHash: null,
      },
    });

    return result.count === 1;
  }

  // Acceso público, limitado a los datos necesarios para renderizar.

  async getPublicOverlay(token: string) {
    if (!isValidOverlayToken(token)) {
      return null;
    }

    const overlay = await this.prisma.runOverlay.findFirst({
      where: {
        OR: [{ obsPublicId: token }, { obsTokenHash: hashOverlayToken(token) }],
      },
      select: {
        layout: true,
        run: {
          select: {
            publishedTeam: {
              select: {
                team: true,
              },
            },
          },
        },
      },
    });

    if (!overlay) {
      return null;
    }

    const parsedLayout = overlayLayoutSchema.safeParse(overlay.layout);

    if (!parsedLayout.success) {
      return null;
    }

    const rawTeam = overlay.run.publishedTeam?.team ?? [];
    const parsedTeam = publishedTeamSchema.safeParse(rawTeam);

    if (!parsedTeam.success) {
      return null;
    }

    return {
      layout: parsedLayout.data,
      pokemon: parsedTeam.data,
    };
  }

  async getObsAccess(actorId: string, runId: string, overlayId: string) {
    const overlay = await this.prisma.runOverlay.findFirst({
      where: {
        id: overlayId,
        runId,
        run: { ownerId: actorId },
      },
      select: {
        obsPublicId: true,
        obsTokenHash: true,
      },
    });

    if (!overlay) {
      return { found: false as const };
    }

    return {
      found: true as const,
      token: overlay.obsPublicId,
      hasLegacyAccess: overlay.obsPublicId === null && overlay.obsTokenHash !== null,
    };
  }

  async getObsStreamAccess(token: string) {
    if (!isValidOverlayToken(token)) {
      return null;
    }

    const overlay = await this.prisma.runOverlay.findFirst({
      where: {
        OR: [{ obsPublicId: token }, { obsTokenHash: hashOverlayToken(token) }],
      },
      select: {
        id: true,
        runId: true,
      },
    });

    if (!overlay) {
      return null;
    }

    return {
      overlayId: overlay.id,
      runId: overlay.runId,
    };
  }
}
