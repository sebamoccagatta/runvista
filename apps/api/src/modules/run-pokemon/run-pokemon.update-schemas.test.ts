import { describe, expect, it } from 'vitest';

import { moveRunPokemonSchema, updateRunPokemonSchema } from './run-pokemon.schemas.js';

describe('updateRunPokemonSchema', () => {
  it('accepts an updated nickname', () => {
    expect(
      updateRunPokemonSchema.parse({
        nickname: 'Ninja',
      }),
    ).toEqual({
      nickname: 'Ninja',
    });
  });

  it('accepts updating level and shiny status', () => {
    expect(
      updateRunPokemonSchema.safeParse({
        level: 50,
        isShiny: true,
      }).success,
    ).toBe(true);
  });

  it('allows clearing optional values', () => {
    expect(
      updateRunPokemonSchema.parse({
        nickname: null,
        level: null,
      }),
    ).toEqual({
      nickname: null,
      level: null,
    });
  });

  it('rejects an empty update', () => {
    expect(updateRunPokemonSchema.safeParse({}).success).toBe(false);
  });

  it('rejects attempts to change ownership or species', () => {
    expect(
      updateRunPokemonSchema.safeParse({
        speciesId: 25,
      }).success,
    ).toBe(false);

    expect(
      updateRunPokemonSchema.safeParse({
        runId: 'another-run',
      }).success,
    ).toBe(false);
  });
});

describe('moveRunPokemonSchema', () => {
  it('accepts moving into a team slot', () => {
    expect(
      moveRunPokemonSchema.parse({
        status: 'TEAM',
        teamSlot: 3,
      }),
    ).toEqual({
      status: 'TEAM',
      teamSlot: 3,
    });
  });

  it('accepts moving to the box', () => {
    expect(
      moveRunPokemonSchema.safeParse({
        status: 'BOX',
        teamSlot: null,
      }).success,
    ).toBe(true);
  });

  it('accepts registering a fainted Pokemon', () => {
    expect(
      moveRunPokemonSchema.safeParse({
        status: 'FAINTED',
      }).success,
    ).toBe(true);
  });

  it('requires a slot when moving to the team', () => {
    expect(
      moveRunPokemonSchema.safeParse({
        status: 'TEAM',
      }).success,
    ).toBe(false);
  });

  it('rejects invalid team slots', () => {
    for (const slot of [0, 7]) {
      expect(
        moveRunPokemonSchema.safeParse({
          status: 'TEAM',
          teamSlot: slot,
        }).success,
      ).toBe(false);
    }
  });

  it('rejects team slots for boxed Pokemon', () => {
    expect(
      moveRunPokemonSchema.safeParse({
        status: 'BOX',
        teamSlot: 2,
      }).success,
    ).toBe(false);
  });

  it('rejects team slots for fainted Pokemon', () => {
    expect(
      moveRunPokemonSchema.safeParse({
        status: 'FAINTED',
        teamSlot: 1,
      }).success,
    ).toBe(false);
  });

  it('rejects an unknown Pokemon status', () => {
    expect(
      moveRunPokemonSchema.safeParse({
        status: 'RELEASED',
      }).success,
    ).toBe(false);
  });
});
