import { describe, expect, it } from 'vitest';

import { getPokeBall, isPokeBallKey, POKE_BALLS } from './pokeballs';

describe('Poke Ball catalog', () => {
  it('contains the 16 classic balls', () => {
    expect(POKE_BALLS).toHaveLength(16);
  });

  it('uses unique keys and names', () => {
    const keys = POKE_BALLS.map((ball) => ball.key);
    const names = POKE_BALLS.map((ball) => ball.name);

    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('points every ball to a PokeAPI item sprite', () => {
    for (const ball of POKE_BALLS) {
      expect(ball.imageUrl).toBe(
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${ball.key}.png`,
      );
    }
  });

  it('defines drawing colors as valid #RRGGBB values', () => {
    const hex = /^#[0-9a-f]{6}$/i;

    for (const ball of POKE_BALLS) {
      expect(ball.colors.top).toMatch(hex);
      expect(ball.colors.bottom).toMatch(hex);

      if (ball.colors.accent !== null) {
        expect(ball.colors.accent).toMatch(hex);
      }
    }
  });

  it('finds balls by key and rejects unknown keys', () => {
    expect(getPokeBall('great-ball')?.name).toBe('Super Ball');
    expect(getPokeBall('no-existe')).toBeUndefined();
    expect(isPokeBallKey('master-ball')).toBe(true);
    expect(isPokeBallKey('MASTER-BALL')).toBe(false);
  });

  it('cannot be mutated at runtime', () => {
    expect(Object.isFrozen(POKE_BALLS)).toBe(true);
  });
});
