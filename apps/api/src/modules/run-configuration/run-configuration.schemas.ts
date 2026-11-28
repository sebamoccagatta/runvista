import { isPokemonGameId } from '@runvista/pokemon';
import { MAX_LEVEL_CAP_INCREASE } from '@runvista/pokemon/badges';
import { z } from 'zod';

export const challengeTypeSchema = z.enum(['NORMAL', 'NUZLOCKE', 'RANDOMLOCKE', 'CUSTOM']);

export const gameIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid game identifier')
  .refine(isPokemonGameId, {
    error: 'Unsupported Pokemon game',
  });

export const levelCapIncreaseSchema = z.number().int().min(0).max(MAX_LEVEL_CAP_INCREASE);

export const saveRunConfigurationSchema = z.strictObject({
  gameId: gameIdSchema,
  challengeType: challengeTypeSchema,
  // Opcional: sin el campo se conserva el aumento actual (o 0 al crear).
  levelCapIncrease: levelCapIncreaseSchema.optional(),
});

export const runConfigurationParamsSchema = z.strictObject({
  id: z.uuid(),
});

export type ChallengeType = z.infer<typeof challengeTypeSchema>;

export type SaveRunConfigurationInput = z.infer<typeof saveRunConfigurationSchema>;
