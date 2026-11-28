import { z } from 'zod';

export const runBadgeParamsSchema = z.strictObject({
  id: z.uuid(),
});

export const setRunBadgeParamsSchema = z.strictObject({
  id: z.uuid(),
  key: z.string().min(1).max(40),
});

export const setRunBadgeBodySchema = z.strictObject({
  obtained: z.boolean(),
});

export type SetRunBadgeBody = z.infer<typeof setRunBadgeBodySchema>;
