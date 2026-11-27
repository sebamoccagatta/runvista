import { isPokeBallKey } from '@runvista/pokemon/pokeballs';
import { isPokemonSpeciesId } from '@runvista/pokemon/species';
import { isPokemonVarietyForSpecies } from '@runvista/pokemon/varieties';
import { z } from 'zod';

export const runPokemonStatusSchema = z.enum(['TEAM', 'BOX', 'FAINTED']);

export const pokemonSpeciesIdSchema = z.number().int().min(1).max(9999).refine(isPokemonSpeciesId, {
  error: 'Unsupported Pokemon species',
});

export const pokemonVarietyIdSchema = z.number().int().positive();

export const pokemonNicknameSchema = z.string().trim().max(50).nullable();

export const pokemonLevelSchema = z.number().int().min(1).max(100).nullable();

export const teamSlotSchema = z.number().int().min(1).max(6).nullable();

export const pokeBallSchema = z
  .string()
  .refine(isPokeBallKey, {
    error: 'Unsupported Poke Ball',
  })
  .nullable();

function validatePosition(
  data: {
    status: 'TEAM' | 'BOX' | 'FAINTED';
    teamSlot?: number | null | undefined;
  },
  context: z.RefinementCtx,
) {
  if (data.status === 'TEAM' && data.teamSlot == null) {
    context.addIssue({
      code: 'custom',
      path: ['teamSlot'],
      message: 'Team Pokemon require a slot',
    });
  }

  if (data.status !== 'TEAM' && data.teamSlot != null) {
    context.addIssue({
      code: 'custom',
      path: ['teamSlot'],
      message: 'Only team Pokemon can have a slot',
    });
  }
}

export const createRunPokemonSchema = z
  .strictObject({
    speciesId: pokemonSpeciesIdSchema,
    pokemonId: pokemonVarietyIdSchema.nullable().optional(),
    nickname: pokemonNicknameSchema.optional(),
    level: pokemonLevelSchema.optional(),
    isShiny: z.boolean().default(false),
    pokeBall: pokeBallSchema.optional(),
    status: runPokemonStatusSchema.default('BOX'),
    teamSlot: teamSlotSchema.optional(),
  })
  .superRefine((data, context) => {
    validatePosition(data, context);

    if (data.pokemonId != null && !isPokemonVarietyForSpecies(data.speciesId, data.pokemonId)) {
      context.addIssue({
        code: 'custom',
        path: ['pokemonId'],
        message: 'Pokemon variety does not belong to the selected species',
      });
    }
  });

export const updateRunPokemonSchema = z
  .strictObject({
    pokemonId: pokemonVarietyIdSchema.nullable().optional(),
    nickname: pokemonNicknameSchema.optional(),
    level: pokemonLevelSchema.optional(),
    isShiny: z.boolean().optional(),
    pokeBall: pokeBallSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    error: 'At least one field must be provided',
  });

export const moveRunPokemonSchema = z
  .strictObject({
    status: runPokemonStatusSchema,
    teamSlot: teamSlotSchema.optional(),
  })
  .superRefine(validatePosition);

export const runPokemonParamsSchema = z.strictObject({
  runId: z.uuid(),
});

export const runPokemonIdParamsSchema = z.strictObject({
  runId: z.uuid(),
  pokemonId: z.uuid(),
});

export type RunPokemonStatus = z.infer<typeof runPokemonStatusSchema>;

export type CreateRunPokemonInput = z.input<typeof createRunPokemonSchema>;

export type ParsedRunPokemonInput = z.output<typeof createRunPokemonSchema>;

export type UpdateRunPokemonInput = z.infer<typeof updateRunPokemonSchema>;

export type MoveRunPokemonInput = z.infer<typeof moveRunPokemonSchema>;
