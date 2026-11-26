import { z } from 'zod';

export const OVERLAY_CANVAS_WIDTH = 1920;
export const OVERLAY_CANVAS_HEIGHT = 1080;

export const overlaySlotSchema = z.number().int().min(1).max(6);

export const overlayElementSchema = z
  .strictObject({
    slot: overlaySlotSchema,

    x: z.number().int().min(0),
    y: z.number().int().min(0),

    width: z.number().int().min(80).max(600),
    height: z.number().int().min(80).max(600),

    visible: z.boolean(),

    showNickname: z.boolean(),
    showSpecies: z.boolean(),
    showLevel: z.boolean(),
  })
  .superRefine((element, context) => {
    if (element.x + element.width > OVERLAY_CANVAS_WIDTH) {
      context.addIssue({
        code: 'custom',
        path: ['x'],
        message: 'Element exceeds canvas width',
      });
    }

    if (element.y + element.height > OVERLAY_CANVAS_HEIGHT) {
      context.addIssue({
        code: 'custom',
        path: ['y'],
        message: 'Element exceeds canvas height',
      });
    }
  });

export const overlayLayoutSchema = z
  .strictObject({
    version: z.literal(1),

    canvas: z.strictObject({
      width: z.literal(OVERLAY_CANVAS_WIDTH),
      height: z.literal(OVERLAY_CANVAS_HEIGHT),
    }),

    elements: z.array(overlayElementSchema).length(6),
  })
  .superRefine((layout, context) => {
    const slots = new Set(layout.elements.map((element) => element.slot));

    if (slots.size !== 6) {
      context.addIssue({
        code: 'custom',
        path: ['elements'],
        message: 'Overlay must have six unique slots',
      });
    }
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

export type OverlayElement = z.infer<typeof overlayElementSchema>;

export type OverlayLayout = z.infer<typeof overlayLayoutSchema>;

export type CreateRunOverlayInput = z.infer<typeof createRunOverlaySchema>;

export type UpdateRunOverlayInput = z.infer<typeof updateRunOverlaySchema>;

export function createDefaultOverlayLayout(): OverlayLayout {
  return {
    version: 1,
    canvas: {
      width: OVERLAY_CANVAS_WIDTH,
      height: OVERLAY_CANVAS_HEIGHT,
    },
    elements: Array.from({ length: 6 }, (_, index) => ({
      slot: index + 1,
      x: 120 + index * 280,
      y: 820,
      width: 220,
      height: 190,
      visible: true,
      showNickname: true,
      showSpecies: false,
      showLevel: true,
    })),
  };
}
