import { describe, expect, it } from 'vitest';

import { publishedTeamSchema } from './run-pokemon-publication.schemas.js';

const charizard = {
  speciesId: 6,
  pokemonId: null,
  nickname: 'Chorizard',
  level: 52,
  isShiny: true,
  teamSlot: 1,
};

describe('Published Pokemon team', () => {
  it('accepts an empty team', () => {
    expect(publishedTeamSchema.safeParse([]).success).toBe(true);
  });

  it('accepts a valid published team', () => {
    expect(publishedTeamSchema.safeParse([charizard]).success).toBe(true);
  });

  it('accepts up to six positions', () => {
    const team = Array.from({ length: 6 }, (_, index) => ({
      ...charizard,
      teamSlot: index + 1,
    }));

    expect(publishedTeamSchema.safeParse(team).success).toBe(true);
  });

  it('rejects more than six Pokemon', () => {
    const team = Array.from({ length: 7 }, (_, index) => ({
      ...charizard,
      teamSlot: index + 1,
    }));

    expect(publishedTeamSchema.safeParse(team).success).toBe(false);
  });

  it('rejects duplicated team slots', () => {
    expect(
      publishedTeamSchema.safeParse([charizard, { ...charizard, speciesId: 25 }]).success,
    ).toBe(false);
  });

  it('rejects invalid levels', () => {
    expect(publishedTeamSchema.safeParse([{ ...charizard, level: 150 }]).success).toBe(false);
  });

  it('rejects unexpected fields', () => {
    expect(
      publishedTeamSchema.safeParse([
        {
          ...charizard,
          ownerId: 'private-user-id',
        },
      ]).success,
    ).toBe(false);
  });
});
