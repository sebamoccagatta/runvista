import { z } from 'zod';

export const runStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED']);

const titleSchema = z.string().trim().min(1).max(150);

const descriptionSchema = z.string().trim().max(2000).nullable();

export const createRunSchema = z.strictObject({
  title: titleSchema,
  description: descriptionSchema.optional(),
});

export const updateRunSchema = z
  .strictObject({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    status: runStatusSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    error: 'At least one field must be provided',
  });

export const runIdParamsSchema = z.strictObject({
  id: z.uuid(),
});

export type CreateRunInput = z.infer<typeof createRunSchema>;
export type UpdateRunInput = z.infer<typeof updateRunSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
