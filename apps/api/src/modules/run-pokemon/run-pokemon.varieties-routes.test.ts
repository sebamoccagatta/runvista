import { afterEach, describe, expect, it, vi } from 'vitest';

import { getPokemonVarieties } from '@runvista/pokemon/varieties';

import { buildApp } from '../../app.js';

import { InvalidPokemonVarietyError } from './run-pokemon.service.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '660e8400-e29b-41d4-a716-446655440000';
const pokemonId = '770e8400-e29b-41d4-a716-446655440000';
const origin = 'http://localhost:5173';

const megaX = getPokemonVarieties(6).find((item) => item.name === 'charizard-mega-x')!;

const apps: ReturnType<typeof buildApp>[] = [];

function createTestApp() {
  const pokemon = {
    id: pokemonId,
    runId,
    speciesId: 6,
    pokemonId: megaX.pokemonId,
  };

  const service = {
    list: vi.fn().mockResolvedValue({
      found: true,
      pokemon: [pokemon],
    }),
    create: vi.fn().mockResolvedValue({
      found: true,
      pokemon,
    }),
    update: vi.fn().mockResolvedValue({
      found: true,
      pokemon,
    }),
    move: vi.fn().mockResolvedValue({
      found: true,
      pokemon,
    }),
  };

  const app = buildApp({
    allowedOrigins: [origin],
    runPokemon: {
      service,
      resolveActorId: () => actorId,
    },
  });

  apps.push(app);

  return { app, service };
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('Run Pokemon variety HTTP routes', () => {
  it('accepts a valid variety when creating', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/pokemon`,
      headers: { origin },
      payload: {
        speciesId: 6,
        pokemonId: megaX.pokemonId,
      },
    });

    expect(response.statusCode).toBe(201);

    expect(service.create).toHaveBeenCalledWith(
      actorId,
      runId,
      expect.objectContaining({
        speciesId: 6,
        pokemonId: megaX.pokemonId,
      }),
    );
  });

  it('rejects mismatched varieties on creation', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/pokemon`,
      headers: { origin },
      payload: {
        speciesId: 25,
        pokemonId: megaX.pokemonId,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('accepts a variety change request', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/runs/${runId}/pokemon/${pokemonId}`,
      headers: { origin },
      payload: {
        pokemonId: megaX.pokemonId,
      },
    });

    expect(response.statusCode).toBe(200);

    expect(service.update).toHaveBeenCalledWith(actorId, runId, pokemonId, {
      pokemonId: megaX.pokemonId,
    });
  });

  it('returns 400 for invalid variety relationships', async () => {
    const { app, service } = createTestApp();

    service.update.mockRejectedValue(new InvalidPokemonVarietyError());

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/runs/${runId}/pokemon/${pokemonId}`,
      headers: { origin },
      payload: {
        pokemonId: megaX.pokemonId,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('INVALID_POKEMON_VARIETY');
  });

  it('accepts resetting the variety', async () => {
    const { app, service } = createTestApp();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/runs/${runId}/pokemon/${pokemonId}`,
      headers: { origin },
      payload: {
        pokemonId: null,
      },
    });

    expect(response.statusCode).toBe(200);

    expect(service.update).toHaveBeenCalledWith(actorId, runId, pokemonId, {
      pokemonId: null,
    });
  });
});
