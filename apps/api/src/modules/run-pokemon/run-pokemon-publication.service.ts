import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';

import { publishedTeamSchema, type PublishedPokemon } from './run-pokemon-publication.schemas.js';

export class RunPokemonPublicationService {
  constructor(private readonly prisma: PrismaClient) {}

  async getStatus(actorId: string, runId: string) {
    const run = await this.prisma.run.findFirst({
      where: {
        id: runId,
        ownerId: actorId,
      },
      select: { id: true },
    });

    if (!run) {
      return { found: false as const };
    }

    const publication = await this.prisma.runPublishedTeam.findUnique({
      where: { runId },
    });

    return {
      found: true as const,
      publication: publication
        ? {
            version: publication.version,
            publishedAt: publication.publishedAt,
          }
        : null,
    };
  }

  async publish(actorId: string, runId: string) {
    return this.prisma.$transaction(
      async (tx) => {
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

        const pokemon = await tx.runPokemon.findMany({
          where: {
            runId,
            status: 'TEAM',
          },
          select: {
            speciesId: true,
            pokemonId: true,
            nickname: true,
            level: true,
            isShiny: true,
            teamSlot: true,
          },
          orderBy: { teamSlot: 'asc' },
        });

        const team: PublishedPokemon[] = pokemon.map((member) => {
          if (member.teamSlot === null) {
            throw new Error('Team Pokemon must have a team slot');
          }

          return {
            speciesId: member.speciesId,
            pokemonId: member.pokemonId,
            nickname: member.nickname,
            level: member.level,
            isShiny: member.isShiny,
            teamSlot: member.teamSlot,
          };
        });

        const validated = publishedTeamSchema.parse(team);

        const publishedAt = new Date();

        const publication = await tx.runPublishedTeam.upsert({
          where: { runId },
          create: {
            runId,
            team: validated as Prisma.InputJsonValue,
            version: 1,
            publishedAt,
          },
          update: {
            team: validated as Prisma.InputJsonValue,
            version: { increment: 1 },
            publishedAt,
          },
        });

        return {
          found: true as const,
          publication: {
            version: publication.version,
            publishedAt: publication.publishedAt,
            pokemon: validated,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
}
