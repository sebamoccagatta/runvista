import { describe, expect, it } from 'vitest';

import {
  MAX_LEVEL_CAP_INCREASE,
  calculateLevelCap,
  getGameBadge,
  getGameBadges,
  hasGameBadges,
  isGameBadgeKey,
  isValidLevelCapIncrease,
} from './badges.js';
import { POKEMON_GAMES } from './games.js';

describe('game badges', () => {
  it('has eight Kanto badges in gym order for Red and Blue', () => {
    const badges = getGameBadges('red');

    expect(badges.map((badge) => badge.leader)).toEqual([
      'Brock',
      'Misty',
      'Teniente Surge',
      'Erika',
      'Koga',
      'Sabrina',
      'Blaine',
      'Giovanni',
    ]);
    expect(badges.map((badge) => badge.levelCap)).toEqual([14, 21, 24, 29, 43, 43, 47, 50]);
  });

  it('shares the Red level caps with Blue', () => {
    expect(getGameBadges('blue')).toEqual(getGameBadges('red'));
  });

  it('uses the higher Yellow level caps', () => {
    expect(getGameBadges('yellow').map((badge) => badge.levelCap)).toEqual([
      12, 21, 28, 32, 50, 50, 54, 55,
    ]);
  });

  it('keeps the same badge keys across the games of a region', () => {
    expect(getGameBadges('yellow').map((badge) => badge.key)).toEqual(
      getGameBadges('red').map((badge) => badge.key),
    );
  });

  it('has unique keys within a game', () => {
    const keys = getGameBadges('red').map((badge) => badge.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('offers nothing for a game without badge data', () => {
    expect(getGameBadges('gold')).toEqual([]);
    expect(hasGameBadges('gold')).toBe(false);
    expect(hasGameBadges('red')).toBe(true);
  });

  it('only has data for games of the catalog', () => {
    const catalog = new Set<string>(POKEMON_GAMES.map((game) => game.id));

    for (const id of ['red', 'blue', 'yellow']) {
      expect(catalog.has(id)).toBe(true);
    }
  });

  it('finds a badge by key only within its own game', () => {
    expect(getGameBadge('red', 'kanto-boulder')?.leader).toBe('Brock');
    expect(getGameBadge('red', 'johto-zephyr')).toBeUndefined();
    expect(isGameBadgeKey('red', 'kanto-earth')).toBe(true);
    expect(isGameBadgeKey('gold', 'kanto-earth')).toBe(false);
  });

  it('gives every badge its colors for the icon', () => {
    for (const badge of getGameBadges('red')) {
      expect(badge.colors.primary).toMatch(/^#[0-9a-f]{6}$/);
      expect(badge.colors.secondary).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('calculateLevelCap', () => {
  it('keeps the base level without an increase', () => {
    expect(calculateLevelCap(14, 0)).toBe(14);
  });

  it('rounds a decimal result up', () => {
    // 14 × 1,10 = 15,4
    expect(calculateLevelCap(14, 10)).toBe(16);
    // 21 × 1,10 = 23,1
    expect(calculateLevelCap(21, 10)).toBe(24);
    // 43 × 1,10 = 47,3
    expect(calculateLevelCap(43, 10)).toBe(48);
  });

  it('does not round up a result that is already an integer', () => {
    // 50 × 1,10 = 55
    expect(calculateLevelCap(50, 10)).toBe(55);
    // 20 × 1,50 = 30
    expect(calculateLevelCap(20, 50)).toBe(30);
  });

  it('is not thrown off by floating point', () => {
    // Con coma flotante, 50 × 1,10 da 55,00000000000001 y se redondearía a 56.
    expect(calculateLevelCap(50, 10)).toBe(55);
    // Igual con 25 × 1,12 = 28,000000000000004, que daría 29.
    expect(calculateLevelCap(25, 12)).toBe(28);
  });

  it('never goes above level 100', () => {
    expect(calculateLevelCap(55, 100)).toBe(100);
    expect(calculateLevelCap(50, 100)).toBe(100);
  });

  it('rejects an increase outside the allowed range', () => {
    expect(() => calculateLevelCap(14, -1)).toThrow(RangeError);
    expect(() => calculateLevelCap(14, MAX_LEVEL_CAP_INCREASE + 1)).toThrow(RangeError);
    expect(() => calculateLevelCap(14, 10.5)).toThrow(RangeError);
    expect(() => calculateLevelCap(14, Number.NaN)).toThrow(RangeError);
  });

  it('rejects a base level that is not a positive integer', () => {
    expect(() => calculateLevelCap(0, 10)).toThrow(RangeError);
    expect(() => calculateLevelCap(14.5, 10)).toThrow(RangeError);
  });
});

describe('isValidLevelCapIncrease', () => {
  it('accepts whole percentages from 0 to 100', () => {
    expect(isValidLevelCapIncrease(0)).toBe(true);
    expect(isValidLevelCapIncrease(10)).toBe(true);
    expect(isValidLevelCapIncrease(100)).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isValidLevelCapIncrease(-1)).toBe(false);
    expect(isValidLevelCapIncrease(101)).toBe(false);
    expect(isValidLevelCapIncrease(2.5)).toBe(false);
    expect(isValidLevelCapIncrease(Number.NaN)).toBe(false);
  });
});
