import { describe, expect, it } from 'vitest';

import {
  createDefaultOverlayLayout,
  createRunOverlaySchema,
  overlayLayoutSchema,
  updateRunOverlaySchema,
} from './run-overlay.schemas.js';

describe('Run overlay layout schemas', () => {
  it('creates a valid default layout', () => {
    const layout = createDefaultOverlayLayout();

    expect(overlayLayoutSchema.safeParse(layout).success).toBe(true);

    expect(layout.elements).toHaveLength(6);
  });

  it('contains six unique team slots', () => {
    const layout = createDefaultOverlayLayout();

    expect(layout.elements.map((item) => item.slot)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('allows independently repositioning an element', () => {
    const layout = createDefaultOverlayLayout();

    layout.elements[0]!.x = 500;
    layout.elements[0]!.y = 250;

    expect(overlayLayoutSchema.safeParse(layout).success).toBe(true);
  });

  it('allows resizing and hiding elements', () => {
    const layout = createDefaultOverlayLayout();

    layout.elements[2]!.width = 320;
    layout.elements[2]!.height = 300;
    layout.elements[2]!.y = 700;
    layout.elements[2]!.visible = false;

    expect(overlayLayoutSchema.safeParse(layout).success).toBe(true);
  });

  it('rejects elements outside the canvas', () => {
    const layout = createDefaultOverlayLayout();

    layout.elements[0]!.x = 1850;

    expect(overlayLayoutSchema.safeParse(layout).success).toBe(false);
  });

  it('rejects duplicated team slots', () => {
    const layout = createDefaultOverlayLayout();

    layout.elements[1]!.slot = 1;

    expect(overlayLayoutSchema.safeParse(layout).success).toBe(false);
  });

  it('rejects invalid dimensions', () => {
    const layout = createDefaultOverlayLayout();

    layout.elements[0]!.width = 0;

    expect(overlayLayoutSchema.safeParse(layout).success).toBe(false);
  });

  it('rejects unknown layout properties', () => {
    const layout = createDefaultOverlayLayout();

    expect(
      overlayLayoutSchema.safeParse({
        ...layout,
        customHtml: '<script>...</script>',
      }).success,
    ).toBe(false);
  });

  it('accepts creating a named overlay', () => {
    expect(
      createRunOverlaySchema.safeParse({
        name: 'Gameplay',
        layout: createDefaultOverlayLayout(),
      }).success,
    ).toBe(true);
  });

  it('rejects an empty update', () => {
    expect(updateRunOverlaySchema.safeParse({}).success).toBe(false);
  });

  it('accepts updating only the layout', () => {
    expect(
      updateRunOverlaySchema.safeParse({
        layout: createDefaultOverlayLayout(),
      }).success,
    ).toBe(true);
  });
});
