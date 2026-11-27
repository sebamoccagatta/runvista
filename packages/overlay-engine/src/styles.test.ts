import { describe, expect, it } from 'vitest';

import {
  FONT_FAMILIES,
  FONT_FAMILY_STACKS,
  getDetailFontSize,
  hexToRgba,
  isHexColor,
  isValidOverlayStyle,
  isValidStylePatch,
  OVERLAY_STYLE_LIMITS,
} from './styles';
import { DEFAULT_OVERLAY_STYLE } from './styles';

describe('isHexColor', () => {
  it('accepts six-digit hex colors', () => {
    expect(isHexColor('#000000')).toBe(true);
    expect(isHexColor('#FFCC00')).toBe(true);
  });

  it('rejects shorthand, names, rgba and non-strings', () => {
    expect(isHexColor('#fff')).toBe(false);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor('rgba(0,0,0,0.5)')).toBe(false);
    expect(isHexColor(0)).toBe(false);
  });

  it('rejects values that could inject CSS', () => {
    expect(isHexColor('#000000; background:url(x)')).toBe(false);
  });
});

describe('style patches', () => {
  it('accepts an empty patch', () => {
    expect(isValidStylePatch({})).toBe(true);
  });

  it('accepts values at the limits', () => {
    expect(isValidStylePatch({ label: { fontSize: OVERLAY_STYLE_LIMITS.fontSize.min } })).toBe(
      true,
    );
    expect(isValidStylePatch({ label: { fontSize: OVERLAY_STYLE_LIMITS.fontSize.max } })).toBe(
      true,
    );
  });

  it('rejects values beyond the limits', () => {
    expect(isValidStylePatch({ label: { fontSize: 7 } })).toBe(false);
    expect(isValidStylePatch({ card: { radius: 65 } })).toBe(false);
    expect(isValidStylePatch({ card: { borderWidth: 17 } })).toBe(false);
    expect(isValidStylePatch({ ball: { opacity: 1.5 } })).toBe(false);
  });

  it('rejects unknown groups and fields', () => {
    expect(isValidStylePatch({ name: { fontSize: 20 } })).toBe(false);
    expect(isValidStylePatch({ label: { glow: true } })).toBe(false);
  });

  it('rejects non-finite numbers', () => {
    expect(isValidStylePatch({ ball: { scale: Number.NaN } })).toBe(false);
  });
});

describe('full overlay style', () => {
  it('accepts the default style', () => {
    expect(isValidOverlayStyle(DEFAULT_OVERLAY_STYLE)).toBe(true);
  });

  it('requires every group', () => {
    const withoutCard: Partial<typeof DEFAULT_OVERLAY_STYLE> = { ...DEFAULT_OVERLAY_STYLE };
    delete withoutCard.card;

    expect(isValidOverlayStyle(withoutCard)).toBe(false);
  });
});

describe('font families', () => {
  it('has a system stack for every family', () => {
    for (const family of FONT_FAMILIES) {
      expect(FONT_FAMILY_STACKS[family]).toBeTruthy();
    }
  });

  it('accepts only the closed list', () => {
    expect(isValidStylePatch({ label: { fontFamily: 'serif' } })).toBe(true);
    expect(isValidStylePatch({ label: { fontFamily: 'Comic Sans' } })).toBe(false);
  });
});

describe('hexToRgba', () => {
  it('converts a hex color and an opacity to rgba', () => {
    expect(hexToRgba('#000000', 0.65)).toBe('rgba(0, 0, 0, 0.65)');
    expect(hexToRgba('#FFCC00', 1)).toBe('rgba(255, 204, 0, 1)');
  });

  it('never outputs arbitrary text for invalid colors', () => {
    expect(hexToRgba('red', 1)).toBe('transparent');
    expect(hexToRgba('#000000; background:url(x)', 1)).toBe('transparent');
  });
});

describe('default sans font', () => {
  it('matches the app font so the default style does not change the text', () => {
    expect(FONT_FAMILY_STACKS.sans).toBe('Inter, system-ui, sans-serif');
  });
});

describe('detail font size', () => {
  it('derives two thirds of the name size', () => {
    expect(getDetailFontSize(36)).toBe(24);
    expect(getDetailFontSize(48)).toBe(32);
  });
});
