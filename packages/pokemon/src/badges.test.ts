import { describe, expect, it } from 'vitest';

import {
  BADGE_REGION_NAMES,
  MAX_LEVEL_CAP_INCREASE,
  calculateLevelCap,
  getGameBadge,
  getGameBadges,
  hasGameBadges,
  isGameBadgeKey,
  isValidLevelCapIncrease,
} from './badges.js';
import { POKEMON_GAMES } from './games.js';

// Alola usa pruebas en lugar de gimnasios y los Leyendas no tienen medallas.
const GAMES_WITHOUT_BADGES = [
  'sun',
  'moon',
  'ultra-sun',
  'ultra-moon',
  'legends-arceus',
  'legends-za',
];

const GAMES_WITH_TWO_REGIONS = ['gold', 'silver', 'crystal', 'heartgold', 'soulsilver'];

function caps(gameId: string): number[] {
  return getGameBadges(gameId).map((badge) => badge.levelCap);
}

function leaders(gameId: string): string[] {
  return getGameBadges(gameId).map((badge) => badge.leader);
}

describe('badge catalog coverage', () => {
  it('has badges for every game with gyms and none for the others', () => {
    for (const game of POKEMON_GAMES) {
      expect(hasGameBadges(game.id), game.id).toBe(!GAMES_WITHOUT_BADGES.includes(game.id));
    }
  });

  it('gives each game eight badges, or sixteen when it has two regions', () => {
    for (const game of POKEMON_GAMES) {
      const expected = GAMES_WITH_TWO_REGIONS.includes(game.id) ? 16 : 8;

      if (GAMES_WITHOUT_BADGES.includes(game.id)) {
        expect(getGameBadges(game.id), game.id).toHaveLength(0);
      } else {
        expect(getGameBadges(game.id), game.id).toHaveLength(expected);
      }
    }
  });

  it('has unique keys within a game', () => {
    for (const game of POKEMON_GAMES) {
      const keys = getGameBadges(game.id).map((badge) => badge.key);

      expect(new Set(keys).size, game.id).toBe(keys.length);
    }
  });

  it('gives every badge a known region, a name, colors and a plausible level cap', () => {
    for (const game of POKEMON_GAMES) {
      for (const badge of getGameBadges(game.id)) {
        expect(Object.keys(BADGE_REGION_NAMES), game.id).toContain(badge.region);
        expect(badge.key.startsWith(`${badge.region}-`), badge.key).toBe(true);
        expect(badge.name.length, badge.key).toBeGreaterThan(0);
        expect(badge.leader.length, badge.key).toBeGreaterThan(0);
        expect(badge.colors.primary, badge.key).toMatch(/^#[0-9a-f]{6}$/);
        expect(badge.colors.secondary, badge.key).toMatch(/^#[0-9a-f]{6}$/);
        expect(Number.isInteger(badge.levelCap), badge.key).toBe(true);
        expect(badge.levelCap, badge.key).toBeGreaterThanOrEqual(1);
        expect(badge.levelCap, badge.key).toBeLessThanOrEqual(100);
      }
    }
  });

  it('keeps database keys within their column length', () => {
    for (const game of POKEMON_GAMES) {
      for (const badge of getGameBadges(game.id)) {
        expect(badge.key.length, badge.key).toBeLessThanOrEqual(40);
      }
    }
  });

  it('puts Johto before Kanto in the games that have both', () => {
    for (const id of GAMES_WITH_TWO_REGIONS) {
      const regions = getGameBadges(id).map((badge) => badge.region);

      expect(
        regions.slice(0, 8).every((region) => region === 'johto'),
        id,
      ).toBe(true);
      expect(
        regions.slice(8).every((region) => region === 'kanto'),
        id,
      ).toBe(true);
    }
  });
});

describe('level caps per game', () => {
  it('uses the highest level of each Kanto leader in Red, Blue, FireRed and LeafGreen', () => {
    expect(caps('red')).toEqual([14, 21, 24, 29, 43, 43, 47, 50]);
    expect(caps('blue')).toEqual(caps('red'));
    expect(caps('firered')).toEqual(caps('red'));
    expect(caps('leafgreen')).toEqual(caps('red'));
  });

  it('uses the higher Yellow level caps', () => {
    expect(caps('yellow')).toEqual([12, 21, 28, 32, 50, 50, 54, 55]);
  });

  it('keeps the same leaders and order in Red and Let’s Go but with different levels', () => {
    expect(leaders('lets-go-pikachu')).toEqual(leaders('red'));
    expect(caps('lets-go-pikachu')).toEqual([12, 19, 26, 34, 44, 44, 48, 50]);
    expect(caps('lets-go-eevee')).toEqual(caps('lets-go-pikachu'));
  });

  it('has the Johto caps in story order, then Kanto from lowest to highest', () => {
    expect(caps('gold').slice(0, 8)).toEqual([9, 16, 20, 25, 30, 35, 31, 40]);

    const kanto = caps('gold').slice(8);

    expect(kanto).toEqual([...kanto].sort((a, b) => a - b));
    expect(kanto.at(-1)).toBe(58);
    expect(leaders('gold').slice(8)).toContain('Janine');
    expect(leaders('gold').slice(8)).toContain('Blue');
    expect(caps('silver')).toEqual(caps('gold'));
    expect(caps('crystal')).toEqual(caps('gold'));
  });

  it('raises the Johto and Kanto caps in HeartGold and SoulSilver', () => {
    expect(caps('heartgold').slice(0, 8)).toEqual([13, 17, 19, 25, 31, 35, 34, 41]);
    expect(caps('heartgold').at(-1)).toBe(60);
    expect(caps('soulsilver')).toEqual(caps('heartgold'));
  });

  it('tells Ruby and Sapphire apart from Emerald in Hoenn', () => {
    expect(caps('ruby')).toEqual([15, 18, 23, 28, 31, 33, 42, 43]);
    expect(caps('sapphire')).toEqual(caps('ruby'));
    expect(leaders('ruby').at(-1)).toBe('Wallace');

    expect(caps('emerald')).toEqual([15, 19, 24, 29, 31, 33, 42, 46]);
    expect(leaders('emerald').at(-1)).toBe('Juan');
  });

  it('has its own Hoenn caps in Omega Ruby and Alpha Sapphire', () => {
    expect(caps('omega-ruby')).toEqual([14, 16, 21, 28, 30, 35, 45, 46]);
    expect(caps('alpha-sapphire')).toEqual(caps('omega-ruby'));
  });

  it('reorders the Sinnoh gyms in Platinum', () => {
    expect(leaders('diamond')[2]).toBe('Maylene');
    expect(caps('diamond')).toEqual([14, 22, 30, 30, 36, 39, 42, 49]);

    expect(leaders('platinum')[2]).toBe('Fantina');
    expect(caps('platinum')).toEqual([14, 22, 26, 32, 37, 41, 44, 50]);
  });

  it('repeats the Diamond and Pearl caps in the Sinnoh remakes', () => {
    expect(caps('brilliant-diamond')).toEqual(caps('diamond'));
    expect(caps('shining-pearl')).toEqual(caps('pearl'));
  });

  it('separates Unova in Black/White from Black 2/White 2', () => {
    expect(caps('black')).toEqual([14, 20, 23, 27, 31, 35, 39, 43]);
    expect(caps('white')).toEqual(caps('black'));
    expect(getGameBadges('black')[0]?.key).toBe('unova-trio');

    expect(caps('black-2')).toEqual([13, 18, 24, 30, 33, 39, 48, 51]);
    expect(caps('white-2')).toEqual(caps('black-2'));
    expect(getGameBadges('black-2')[0]?.key).toBe('unova-basic');
  });

  it('has the Kalos caps in X and Y', () => {
    expect(caps('x')).toEqual([12, 25, 32, 34, 37, 42, 48, 59]);
    expect(caps('y')).toEqual(caps('x'));
  });

  it('gives Sword and Shield different leaders and badges in two gyms', () => {
    expect(leaders('sword')[3]).toBe('Bea');
    expect(leaders('shield')[3]).toBe('Allister');
    expect(leaders('sword')[5]).toBe('Gordie');
    expect(leaders('shield')[5]).toBe('Melony');

    expect(getGameBadges('sword')[3]?.key).toBe('galar-fighting');
    expect(getGameBadges('shield')[3]?.key).toBe('galar-ghost');

    expect(caps('sword')).toEqual([20, 24, 27, 36, 38, 42, 46, 48]);
    expect(caps('shield')).toEqual(caps('sword'));
  });

  it('uses the main team of the Paldea leaders, not the rematch', () => {
    expect(caps('scarlet')).toEqual([15, 17, 24, 30, 36, 42, 45, 48]);
    expect(caps('violet')).toEqual(caps('scarlet'));
  });
});

describe('badge lookups', () => {
  it('finds a badge by key only within its own game', () => {
    expect(getGameBadge('red', 'kanto-boulder')?.leader).toBe('Brock');
    expect(getGameBadge('red', 'johto-zephyr')).toBeUndefined();
    expect(getGameBadge('gold', 'johto-zephyr')?.leader).toBe('Falkner');
    expect(isGameBadgeKey('red', 'kanto-earth')).toBe(true);
    expect(isGameBadgeKey('sun', 'kanto-earth')).toBe(false);
  });

  it('keeps the same badge key across the games that share it', () => {
    expect(getGameBadge('red', 'kanto-soul')?.leader).toBe('Koga');
    expect(getGameBadge('gold', 'kanto-soul')?.leader).toBe('Janine');
  });

  it('offers nothing for an unknown game', () => {
    expect(getGameBadges('pokemon-inventado')).toEqual([]);
  });
});

describe('calculateLevelCap', () => {
  it('keeps the base level without an increase', () => {
    expect(calculateLevelCap(14, 0)).toBe(14);
  });

  it('rounds a decimal result to the nearest level', () => {
    // 14 × 1,10 = 15,4 → 15
    expect(calculateLevelCap(14, 10)).toBe(15);
    // 21 × 1,10 = 23,1 → 23
    expect(calculateLevelCap(21, 10)).toBe(23);
    // 43 × 1,10 = 47,3 → 47
    expect(calculateLevelCap(43, 10)).toBe(47);
    // 29 × 1,10 = 31,9 → 32
    expect(calculateLevelCap(29, 10)).toBe(32);
  });

  it('rounds a half level up', () => {
    // 15 × 1,10 = 16,5 → 17
    expect(calculateLevelCap(15, 10)).toBe(17);
  });

  it('keeps a result below the half level at the lower level', () => {
    // 14 × 1,02 = 14,28 → 14
    expect(calculateLevelCap(14, 2)).toBe(14);
  });

  it('does not change a result that is already an integer', () => {
    // 50 × 1,10 = 55
    expect(calculateLevelCap(50, 10)).toBe(55);
    // 20 × 1,50 = 30
    expect(calculateLevelCap(20, 50)).toBe(30);
  });

  it('is not thrown off by floating point', () => {
    // Con coma flotante, 50 × 1,10 da 55,00000000000001: el resultado sigue siendo 55.
    expect(calculateLevelCap(50, 10)).toBe(55);
    // 25 × 1,12 = 28,000000000000004: el resultado sigue siendo 28.
    expect(calculateLevelCap(25, 12)).toBe(28);
  });

  it('never goes above level 100', () => {
    expect(calculateLevelCap(55, 100)).toBe(100);
    expect(calculateLevelCap(60, 100)).toBe(100);
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
