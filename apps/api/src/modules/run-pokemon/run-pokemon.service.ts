import { isPokemonVarietyForSpecies } from '@runvista/pokemon/varieties';

import type { PrismaClient } from '../../generated/prisma/client.js';

import {
  createRunPokemonSchema,
  moveRunPokemonSchema,
  updateRunPokemonSchema,
  type CreateRunPokemonInput,
  type MoveRunPokemonInput,
  type UpdateRunPokemonInput,
} from './run-pokemon.schemas.js';

export class TeamSlotOccupiedError extends Error {
  constructor() {
    super('The selected team slot is occupied');
    this.name = 'TeamSlotOccupiedError';
  }
}

export class InvalidPokemonVarietyError extends Error {
  constructor() {
    super('Pokemon variety does not belong to the selected species');
    this.name = 'InvalidPokemonVarietyError';
  }
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

export class RunPokemonService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(actorId: string, runId: string) {
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
      return { found: false as const };
    }

    const pokemon = await this.prisma.runPokemon.findMany({
      where: { runId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return {
      found: true as const,
      pokemon,
    };
  }

  async create(actorId: string, runId: string, input: CreateRunPokemonInput) {
    const data = createRunPokemonSchema.parse(input);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const run = await tx.run.findFirst({
          where: {
            id: runId,
            ownerId: actorId,
          },
          select: { id: true },
        });

        if (!run) {
          return { found: false as const };
        }

        const pokemon = await tx.runPokemon.create({
          data: {
            runId,
            speciesId: data.speciesId,
            ...(data.pokemonId != null && {
              pokemonId: data.pokemonId,
            }),
            nickname: data.nickname ?? null,
            level: data.level ?? null,
            isShiny: data.isShiny,
            status: data.status,
            teamSlot: data.status === 'TEAM' ? data.teamSlot! : null,
          },
        });

        return {
          found: true as const,
          pokemon,
        };
      });
    } catch (error) {
      if (data.status === 'TEAM' && isPrismaError(error, 'P2002')) {
        throw new TeamSlotOccupiedError();
      }

      throw error;
    }
  }

  async update(actorId: string, runId: string, pokemonId: string, input: UpdateRunPokemonInput) {
    const data = updateRunPokemonSchema.parse(input);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const run = await tx.run.findFirst({
          where: {
            id: runId,
            ownerId: actorId,
          },
          select: { id: true },
        });

        if (!run) {
          return { found: false as const };
        }

        const existing = await tx.runPokemon.findFirst({
          where: {
            id: pokemonId,
            runId,
          },
          select:
            data.pokemonId != null
              ? {
                  id: true,
                  speciesId: true,
                }
              : {
                  id: true,
                },
        });

        if (!existing) {
          return { found: false as const };
        }

        if (
          data.pokemonId != null &&
          'speciesId' in existing &&
          typeof existing.speciesId === 'number' &&
          !isPokemonVarietyForSpecies(existing.speciesId, data.pokemonId)
        ) {
          throw new InvalidPokemonVarietyError();
        }

        const pokemon = await tx.runPokemon.update({
          where: {
            id: pokemonId,
          },
          data: {
            ...(data.pokemonId !== undefined && {
              pokemonId: data.pokemonId,
            }),
            ...(data.nickname !== undefined && {
              nickname: data.nickname,
            }),
            ...(data.level !== undefined && {
              level: data.level,
            }),
            ...(data.isShiny !== undefined && {
              isShiny: data.isShiny,
            }),
          },
        });

        return {
          found: true as const,
          pokemon,
        };
      });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) {
        return { found: false as const };
      }

      throw error;
    }
  }

  async move(actorId: string, runId: string, pokemonId: string, input: MoveRunPokemonInput) {
    const data = moveRunPokemonSchema.parse(input);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const run = await tx.run.findFirst({
          where: {
            id: runId,
            ownerId: actorId,
          },
          select: { id: true },
        });

        if (!run) {
          return { found: false as const };
        }

        const existing = await tx.runPokemon.findFirst({
          where: {
            id: pokemonId,
            runId,
          },
          select: { id: true },
        });

        if (!existing) {
          return { found: false as const };
        }

        const pokemon = await tx.runPokemon.update({
          where: {
            id: pokemonId,
          },
          data: {
            status: data.status,
            teamSlot: data.status === 'TEAM' ? data.teamSlot! : null,
          },
        });

        return {
          found: true as const,
          pokemon,
        };
      });
    } catch (error) {
      if (data.status === 'TEAM' && isPrismaError(error, 'P2002')) {
        throw new TeamSlotOccupiedError();
      }

      if (isPrismaError(error, 'P2025')) {
        return { found: false as const };
      }

      throw error;
    }
  }
}
