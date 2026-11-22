import { describe, expect, it } from 'vitest';

import {
  challengeTypeSchema,
  gameIdSchema,
  runConfigurationParamsSchema,
  saveRunConfigurationSchema,
} from './run-configuration.schemas.js';

describe('challengeTypeSchema', () => {
  it('accepts supported challenge types', () => {
    for (const type of ['NORMAL', 'NUZLOCKE', 'RANDOMLOCKE', 'CUSTOM']) {
      expect(challengeTypeSchema.safeParse(type).success).toBe(true);
    }
  });

  it('rejects unknown challenge types', () => {
    expect(challengeTypeSchema.safeParse('HARDCORE').success).toBe(false);
  });
});

describe('gameIdSchema', () => {
  it('accepts games registered in the catalog', () => {
    for (const id of ['y', 'emerald', 'omega-ruby', 'legends-arceus']) {
      expect(gameIdSchema.safeParse(id).success).toBe(true);
    }
  });

  it('rejects an empty identifier', () => {
    expect(gameIdSchema.safeParse('').success).toBe(false);
  });

  it('rejects malformed identifiers', () => {
    for (const id of ['Pokemon Y', 'omega_ruby', '-emerald', 'emerald-']) {
      expect(gameIdSchema.safeParse(id).success).toBe(false);
    }
  });

  it('rejects games absent from the catalog', () => {
    for (const id of ['pokemon-inventado', 'unknown', 'pokemon-y']) {
      expect(gameIdSchema.safeParse(id).success).toBe(false);
    }
  });
});

describe('saveRunConfigurationSchema', () => {
  it('accepts a minimal configuration', () => {
    expect(
      saveRunConfigurationSchema.parse({
        gameId: 'y',
        challengeType: 'RANDOMLOCKE',
      }),
    ).toEqual({
      gameId: 'y',
      challengeType: 'RANDOMLOCKE',
    });
  });

  it('requires a game and challenge type', () => {
    expect(saveRunConfigurationSchema.safeParse({}).success).toBe(false);
  });

  it('rejects unexpected fields', () => {
    expect(
      saveRunConfigurationSchema.safeParse({
        gameId: 'y',
        challengeType: 'NUZLOCKE',
        ownerId: 'another-user',
      }).success,
    ).toBe(false);
  });

  it('rejects unsupported games', () => {
    expect(
      saveRunConfigurationSchema.safeParse({
        gameId: 'unknown',
        challengeType: 'NUZLOCKE',
      }).success,
    ).toBe(false);
  });

  it('rejects unsupported challenge types', () => {
    expect(
      saveRunConfigurationSchema.safeParse({
        gameId: 'y',
        challengeType: 'UNKNOWN',
      }).success,
    ).toBe(false);
  });
});

describe('runConfigurationParamsSchema', () => {
  it('accepts a valid run UUID', () => {
    expect(
      runConfigurationParamsSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(true);
  });

  it('rejects an invalid run UUID', () => {
    expect(
      runConfigurationParamsSchema.safeParse({
        id: 'invalid',
      }).success,
    ).toBe(false);
  });
});
