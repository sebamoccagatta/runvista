import {
  createDefaultOverlayLayout,
  OVERLAY_CANVAS_HEIGHT,
  OVERLAY_CANVAS_WIDTH,
  upgradeLayout,
  type OverlayElement,
  type OverlayLayout,
} from '@runvista/overlay-engine';
import { z } from 'zod';

export { createDefaultOverlayLayout, OVERLAY_CANVAS_HEIGHT, OVERLAY_CANVAS_WIDTH };

export type { OverlayElement, OverlayLayout };

/**
 * Acepta layouts v1 o v2 y siempre produce v2. Las reglas (geometría, rangos de
 * estilo, claves permitidas) viven en @runvista/overlay-engine, que también usa
 * la web, para que ambos lados validen exactamente lo mismo.
 */
export const overlayLayoutSchema = z.unknown().transform((value, context): OverlayLayout => {
  const layout = upgradeLayout(value);

  if (layout === null) {
    context.addIssue({
      code: 'custom',
      message: 'Invalid overlay layout',
    });

    return z.NEVER;
  }

  return layout;
});

export const createRunOverlaySchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  layout: overlayLayoutSchema,
});

export const updateRunOverlaySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(80).optional(),
    layout: overlayLayoutSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    error: 'At least one field must be provided',
  });

export type CreateRunOverlayInput = z.infer<typeof createRunOverlaySchema>;

export type UpdateRunOverlayInput = z.infer<typeof updateRunOverlaySchema>;
