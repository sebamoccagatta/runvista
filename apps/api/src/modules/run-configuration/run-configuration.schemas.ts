import { isPokemonGameId } from '@runvista/pokemon';
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

export const saveRunConfigurationSchema = z.strictObject({
  gameId: gameIdSchema,
  challengeType: challengeTypeSchema,
});

export const runConfigurationParamsSchema = z.strictObject({
  id: z.uuid(),
});

export type ChallengeType = z.infer<typeof challengeTypeSchema>;

export type SaveRunConfigurationInput = z.infer<typeof saveRunConfigurationSchema>;
