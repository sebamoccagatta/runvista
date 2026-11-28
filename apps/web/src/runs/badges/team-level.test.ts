import { describe, expect, it } from 'vitest';

import { getHighestTeamLevel, isTeamOverCap } from './team-level';

describe('getHighestTeamLevel', () => {
  it('returns the highest level of the active team', () => {
    expect(
      getHighestTeamLevel([
        { status: 'TEAM', level: 12 },
        { status: 'TEAM', level: 31 },
        { status: 'TEAM', level: 20 },
      ]),
    ).toBe(31);
  });

  it('ignores Pokémon in the box or fainted', () => {
    expect(
      getHighestTeamLevel([
        { status: 'TEAM', level: 10 },
        { status: 'BOX', level: 60 },
        { status: 'FAINTED', level: 55 },
      ]),
    ).toBe(10);
  });

  it('ignores Pokémon without a level', () => {
    expect(
      getHighestTeamLevel([
        { status: 'TEAM', level: null },
        { status: 'TEAM', level: 9 },
      ]),
    ).toBe(9);
  });

  it('returns null when there is no level to compare', () => {
    expect(getHighestTeamLevel([])).toBeNull();
    expect(getHighestTeamLevel([{ status: 'BOX', level: 40 }])).toBeNull();
  });
});

describe('isTeamOverCap', () => {
  it('is true only above the cap', () => {
    expect(isTeamOverCap(16, 15)).toBe(true);
    expect(isTeamOverCap(15, 15)).toBe(false);
    expect(isTeamOverCap(14, 15)).toBe(false);
  });

  it('is false without a team level', () => {
    expect(isTeamOverCap(null, 15)).toBe(false);
  });
});
