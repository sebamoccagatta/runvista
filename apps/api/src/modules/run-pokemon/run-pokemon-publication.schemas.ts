import { isPokeBallKey } from '@runvista/pokemon/pokeballs';
import { z } from 'zod';

export const publishedPokemonSchema = z.strictObject({
  speciesId: z.number().int().positive(),
  pokemonId: z.number().int().positive().nullable(),
  nickname: z.string().max(50).nullable(),
  level: z.number().int().min(1).max(100).nullable(),
  isShiny: z.boolean(),
  // Snapshots publicados antes de esta versión no tienen pokeBall.
  pokeBall: z
    .string()
    .refine(isPokeBallKey, { error: 'Unsupported Poke Ball' })
    .nullable()
    .default(null),
  teamSlot: z.number().int().min(1).max(6),
});

export const publishedTeamSchema = z
  .array(publishedPokemonSchema)
  .max(6)
  .superRefine((team, context) => {
    const slots = new Set(team.map((pokemon) => pokemon.teamSlot));

    if (slots.size !== team.length) {
      context.addIssue({
        code: 'custom',
        message: 'Published team contains duplicate slots',
      });
    }
  });

export type PublishedPokemon = z.infer<typeof publishedPokemonSchema>;

export type PublishedTeam = z.infer<typeof publishedTeamSchema>;
