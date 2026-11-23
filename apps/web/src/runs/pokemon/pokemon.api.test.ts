import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RunApiError } from '../api/runs.api';

import {
  createRunPokemon,
  getPokemonErrorMessage,
  isRunPokemon,
  listRunPokemon,
  moveRunPokemon,
  updateRunPokemon,
} from './pokemon.api';

const runId = '550e8400-e29b-41d4-a716-446655440000';
const pokemonId = '660e8400-e29b-41d4-a716-446655440000';

const pokemon = {
  id: pokemonId,
  runId,
  speciesId: 658,
  nickname: 'Ninja',
  level: 42,
  isShiny: false,
  status: 'TEAM',
  teamSlot: 1,
  createdAt: '2026-11-23T12:00:00.000Z',
  updatedAt: '2026-11-23T12:00:00.000Z',
};

const fetchMock = vi.fn();

function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Run Pokemon API', () => {
  it('lists Pokemon from a run', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { pokemon: [pokemon] }));

    const result = await listRunPokemon(runId);

    expect(result).toEqual([pokemon]);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/runs/${runId}/pokemon`,
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      }),
    );
  });

  it('accepts an empty Pokemon list', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { pokemon: [] }));

    await expect(listRunPokemon(runId)).resolves.toEqual([]);
  });

  it('passes an abort signal to fetch', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { pokemon: [] }));

    const controller = new AbortController();

    await listRunPokemon(runId, controller.signal);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/runs/${runId}/pokemon`,
      expect.objectContaining({
        signal: controller.signal,
      }),
    );
  });

  it('creates a Pokemon', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { pokemon }));

    const input = {
      speciesId: 658,
      nickname: 'Ninja',
      level: 42,
      status: 'TEAM' as const,
      teamSlot: 1,
    };

    const result = await createRunPokemon(runId, input);

    expect(result).toEqual(pokemon);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/runs/${runId}/pokemon`,
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(input),
      }),
    );
  });

  it('updates Pokemon details', async () => {
    const updated = {
      ...pokemon,
      nickname: 'Nuevo Ninja',
      level: 50,
    };

    fetchMock.mockResolvedValue(jsonResponse(200, { pokemon: updated }));

    const result = await updateRunPokemon(runId, pokemonId, {
      nickname: 'Nuevo Ninja',
      level: 50,
    });

    expect(result.nickname).toBe('Nuevo Ninja');

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/runs/${runId}/pokemon/${pokemonId}`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          nickname: 'Nuevo Ninja',
          level: 50,
        }),
      }),
    );
  });

  it('moves a Pokemon to the box', async () => {
    const boxed = {
      ...pokemon,
      status: 'BOX',
      teamSlot: null,
    };

    fetchMock.mockResolvedValue(jsonResponse(200, { pokemon: boxed }));

    const result = await moveRunPokemon(runId, pokemonId, { status: 'BOX' });

    expect(result.teamSlot).toBeNull();

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/runs/${runId}/pokemon/${pokemonId}/move`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'BOX' }),
      }),
    );
  });

  it.each([400, 401, 404, 409, 500])('preserves HTTP %i errors', async (status) => {
    fetchMock.mockResolvedValue(
      jsonResponse(status, {
        error: 'REQUEST_FAILED',
      }),
    );

    await expect(listRunPokemon(runId)).rejects.toMatchObject({
      name: 'RunApiError',
      status,
    });
  });

  it('rejects a malformed Pokemon response', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(201, {
        pokemon: {
          ...pokemon,
          speciesId: 9999,
        },
      }),
    );

    await expect(createRunPokemon(runId, { speciesId: 658 })).rejects.toThrow(
      'Invalid Pokemon response',
    );
  });

  it('rejects Pokemon from another run', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        pokemon: [
          {
            ...pokemon,
            runId: '770e8400-e29b-41d4-a716-446655440000',
          },
        ],
      }),
    );

    await expect(listRunPokemon(runId)).rejects.toThrow('Invalid Pokemon list response');
  });

  it('rejects invalid team positions', () => {
    expect(
      isRunPokemon({
        ...pokemon,
        teamSlot: 7,
      }),
    ).toBe(false);
  });

  it('rejects a slot assigned to a boxed Pokemon', () => {
    expect(
      isRunPokemon({
        ...pokemon,
        status: 'BOX',
        teamSlot: 1,
      }),
    ).toBe(false);
  });

  it('rejects a response for the wrong Pokemon', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        pokemon: {
          ...pokemon,
          id: '770e8400-e29b-41d4-a716-446655440000',
        },
      }),
    );

    await expect(
      updateRunPokemon(runId, pokemonId, {
        level: 50,
      }),
    ).rejects.toThrow('Invalid Pokemon response');
  });

  it('translates occupied team slots', () => {
    expect(getPokemonErrorMessage(new RunApiError('Conflict', 409))).toBe(
      'Esa posición del equipo ya está ocupada.',
    );
  });
});
