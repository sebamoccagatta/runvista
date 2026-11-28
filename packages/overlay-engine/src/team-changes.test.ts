import { describe, expect, it } from 'vitest';

import {
  diffTeamSnapshots,
  getTeamMemberFingerprint,
  getTeamSlotMembers,
  type TeamChangeMember,
} from './team-changes.js';

function member(slot: number, overrides: Partial<TeamChangeMember> = {}): TeamChangeMember {
  return {
    speciesId: 25,
    pokemonId: null,
    isShiny: false,
    nickname: `Pika${slot}`,
    pokeBall: null,
    teamSlot: slot,
    status: 'TEAM',
    ...overrides,
  };
}

function fingerprints(members: TeamChangeMember[]): Map<number, string> {
  return new Map(
    [...getTeamSlotMembers(members)].map(([slot, item]) => [slot, getTeamMemberFingerprint(item)]),
  );
}

describe('getTeamSlotMembers', () => {
  it('keeps only team members, indexed by slot', () => {
    const slots = getTeamSlotMembers([
      member(1),
      member(2, { status: 'BOX' }),
      member(3, { teamSlot: null }),
    ]);

    expect([...slots.keys()]).toEqual([1]);
  });

  it('accepts members without a status, as older snapshots do', () => {
    const legacy: TeamChangeMember = { ...member(4) };
    delete legacy.status;

    expect(getTeamSlotMembers([legacy]).has(4)).toBe(true);
  });
});

describe('getTeamMemberFingerprint', () => {
  it('changes when anything visible changes', () => {
    const base = getTeamMemberFingerprint(member(1));

    expect(getTeamMemberFingerprint(member(1, { isShiny: true }))).not.toBe(base);
    expect(getTeamMemberFingerprint(member(1, { nickname: 'Otro' }))).not.toBe(base);
    expect(getTeamMemberFingerprint(member(1, { pokeBall: 'great-ball' }))).not.toBe(base);
    expect(getTeamMemberFingerprint(member(1, { speciesId: 4 }))).not.toBe(base);
  });

  it('treats a missing ball as no ball', () => {
    expect(getTeamMemberFingerprint(member(1, { pokeBall: undefined }))).toBe(
      getTeamMemberFingerprint(member(1, { pokeBall: null })),
    );
  });
});

describe('diffTeamSnapshots', () => {
  it('reports nothing when the team is the same', () => {
    const team = fingerprints([member(1), member(2)]);

    expect(diffTeamSnapshots(team, fingerprints([member(1), member(2)]))).toEqual({
      captured: [],
      replaced: [],
      removed: [],
    });
  });

  it('reports a slot that was empty and now has a Pokémon as captured', () => {
    const before = fingerprints([member(1)]);
    const after = fingerprints([member(1), member(2)]);

    expect(diffTeamSnapshots(before, after)).toEqual({
      captured: [2],
      replaced: [],
      removed: [],
    });
  });

  it('reports a slot whose Pokémon changed as replaced', () => {
    const before = fingerprints([member(1)]);
    const after = fingerprints([member(1, { speciesId: 4, nickname: null })]);

    expect(diffTeamSnapshots(before, after)).toEqual({
      captured: [],
      replaced: [1],
      removed: [],
    });
  });

  it('reports a slot that became empty as removed', () => {
    const before = fingerprints([member(1), member(2)]);
    const after = fingerprints([member(1)]);

    expect(diffTeamSnapshots(before, after)).toEqual({
      captured: [],
      replaced: [],
      removed: [2],
    });
  });

  it('reports every kind of change in one snapshot pair', () => {
    const before = fingerprints([member(1), member(2), member(3)]);
    const after = fingerprints([
      member(1, { isShiny: true }),
      member(4),
      member(3, { teamSlot: 5 }),
    ]);

    expect(diffTeamSnapshots(before, after)).toEqual({
      captured: [4, 5],
      replaced: [1],
      removed: [2, 3],
    });
  });
});
