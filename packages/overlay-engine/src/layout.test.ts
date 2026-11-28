import { describe, expect, it } from 'vitest';

import {
  createDefaultOverlayLayout,
  resolveElementStyle,
  upgradeLayout,
  type OverlayLayout,
} from './layout';
import { DEFAULT_OVERLAY_STYLE, getDetailFontSize } from './styles';

function v1Layout() {
  return {
    version: 1,
    canvas: { width: 1920, height: 1080 },
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

function v2Layout(): OverlayLayout {
  return createDefaultOverlayLayout();
}

describe('overlay layout versions', () => {
  it('creates a version 2 default layout that validates', () => {
    const layout = createDefaultOverlayLayout();

    expect(layout.version).toBe(2);
    expect(upgradeLayout(layout)).not.toBeNull();
  });

  it('upgrades a version 1 layout keeping its geometry and using the default style', () => {
    const upgraded = upgradeLayout(v1Layout());

    expect(upgraded).not.toBeNull();
    expect(upgraded?.version).toBe(2);
    expect(upgraded?.style).toEqual(DEFAULT_OVERLAY_STYLE);
    expect(upgraded?.animations).toEqual({ enabled: true });
    expect(upgraded?.elements[0]).toMatchObject({ slot: 1, x: 120, y: 820, width: 220 });
    expect(upgraded?.elements.every((element) => element.style === undefined)).toBe(true);
  });

  it('rejects layouts with the wrong canvas', () => {
    expect(upgradeLayout({ ...v1Layout(), canvas: { width: 1280, height: 720 } })).toBeNull();
  });

  it('rejects version 1 layouts with duplicate slots', () => {
    const layout = v1Layout();
    layout.elements[1]!.slot = 1;

    expect(upgradeLayout(layout)).toBeNull();
  });

  it('rejects elements that exceed the canvas', () => {
    const layout = v1Layout();
    layout.elements[0]!.x = 1900;

    expect(upgradeLayout(layout)).toBeNull();
  });

  it('rejects unknown versions and non-objects', () => {
    expect(upgradeLayout({ ...v1Layout(), version: 3 })).toBeNull();
    expect(upgradeLayout(null)).toBeNull();
    expect(upgradeLayout('overlay')).toBeNull();
  });
});

describe('overlay layout strictness', () => {
  it('rejects unknown top-level properties in both versions', () => {
    expect(upgradeLayout({ ...v1Layout(), customHtml: '<script>' })).toBeNull();
    expect(upgradeLayout({ ...v2Layout(), customHtml: '<script>' })).toBeNull();
  });

  it('rejects unknown element properties', () => {
    const layout = v2Layout() as unknown as { elements: Record<string, unknown>[] };
    layout.elements[0]!.onClick = 'alert(1)';

    expect(upgradeLayout(layout)).toBeNull();
  });

  it('rejects a style on a version 1 element', () => {
    const layout = v1Layout() as unknown as { elements: Record<string, unknown>[] };
    layout.elements[0]!.style = { label: { fontSize: 40 } };

    expect(upgradeLayout(layout)).toBeNull();
  });

  it('rejects unknown canvas and animations properties', () => {
    expect(
      upgradeLayout({ ...v2Layout(), canvas: { width: 1920, height: 1080, dpi: 2 } }),
    ).toBeNull();
    expect(upgradeLayout({ ...v2Layout(), animations: { enabled: true, speed: 2 } })).toBeNull();
  });

  it('requires the animations switch to be a boolean', () => {
    expect(upgradeLayout({ ...v2Layout(), animations: { enabled: 'yes' } })).toBeNull();
  });
});

describe('overlay style validation in layouts', () => {
  it('accepts a per-element style patch', () => {
    const layout = v2Layout();
    layout.elements[0]!.style = { label: { fontSize: 48, color: '#ffcc00' } };

    expect(upgradeLayout(layout)).not.toBeNull();
  });

  it('rejects a font size outside the limits', () => {
    const layout = v2Layout();
    layout.style.label.fontSize = 200;

    expect(upgradeLayout(layout)).toBeNull();
  });

  it('rejects colors that are not #RRGGBB', () => {
    const layout = v2Layout();
    layout.style.card.background = 'red';

    expect(upgradeLayout(layout)).toBeNull();
  });

  it('rejects font families outside the closed list', () => {
    const layout = v2Layout() as unknown as { style: { label: { fontFamily: string } } };
    layout.style.label.fontFamily = 'comic-sans';

    expect(upgradeLayout(layout)).toBeNull();
  });

  it('rejects unknown style keys', () => {
    const layout = v2Layout() as unknown as { style: Record<string, unknown> };
    layout.style.shadowColor = '#000000';

    expect(upgradeLayout(layout)).toBeNull();
  });

  it('rejects a patch with an invalid element value', () => {
    const layout = v2Layout();
    layout.elements[0]!.style = { ball: { scale: 3 } };

    expect(upgradeLayout(layout)).toBeNull();
  });
});

describe('layout style ownership', () => {
  it('gives each layout its own style copy', () => {
    const first = createDefaultOverlayLayout();
    const second = createDefaultOverlayLayout();

    expect(() => {
      first.style.label.fontSize = 60;
    }).not.toThrow();

    expect(second.style.label.fontSize).toBe(DEFAULT_OVERLAY_STYLE.label.fontSize);
    expect(DEFAULT_OVERLAY_STYLE.label.fontSize).toBe(36);
  });
});

describe('effective element style', () => {
  it('uses the common style when the element has no patch', () => {
    const layout = v2Layout();

    expect(resolveElementStyle(layout, layout.elements[0]!)).toEqual(DEFAULT_OVERLAY_STYLE);
  });

  it('overrides only the fields the element changes, group by group', () => {
    const layout = v2Layout();
    const element = {
      ...layout.elements[0]!,
      style: { label: { fontSize: 48 } },
    };

    const style = resolveElementStyle(layout, element);

    expect(style.label.fontSize).toBe(48);
    expect(style.label.color).toBe(DEFAULT_OVERLAY_STYLE.label.color);
    expect(style.card).toEqual(DEFAULT_OVERLAY_STYLE.card);
    expect(style.ball).toEqual(DEFAULT_OVERLAY_STYLE.ball);
  });

  it('does not change the common style when an element overrides it', () => {
    const layout = v2Layout();
    const element = { ...layout.elements[0]!, style: { label: { fontSize: 48 } } };

    resolveElementStyle(layout, element);

    expect(layout.style.label.fontSize).toBe(DEFAULT_OVERLAY_STYLE.label.fontSize);
  });
});

describe('default style matches the version 1 appearance', () => {
  it('keeps the name at 36 px and the detail lines at 24 px', () => {
    expect(DEFAULT_OVERLAY_STYLE.label.fontSize).toBe(36);
    expect(getDetailFontSize(DEFAULT_OVERLAY_STYLE.label.fontSize)).toBe(24);
  });

  it('keeps the label background at 65 % black and the ball at 85 %', () => {
    expect(DEFAULT_OVERLAY_STYLE.label.background).toBe('#000000');
    expect(DEFAULT_OVERLAY_STYLE.label.backgroundOpacity).toBe(0.65);
    expect(DEFAULT_OVERLAY_STYLE.ball.opacity).toBe(0.85);
    expect(DEFAULT_OVERLAY_STYLE.ball.scale).toBe(1.15);
  });

  it('draws the card without background or border', () => {
    expect(DEFAULT_OVERLAY_STYLE.card.backgroundOpacity).toBe(0);
    expect(DEFAULT_OVERLAY_STYLE.card.borderWidth).toBe(0);
    expect(DEFAULT_OVERLAY_STYLE.card.radius).toBe(0);
  });
});
