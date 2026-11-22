import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRun, deleteRun, isRun, listRuns, RunApiError, updateRun } from './runs.api';

const run = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  ownerId: '650e8400-e29b-41d4-a716-446655440000',
  title: 'Pokémon Y',
  description: 'Randomlocke de sexta generación',
  status: 'DRAFT',
  createdAt: '2026-11-21T20:00:00.000Z',
  updatedAt: '2026-11-21T20:00:00.000Z',
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

describe('Runs API', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists authenticated user runs', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [run]));

    const result = await listRuns();

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Pokémon Y');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/runs',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      }),
    );
  });

  it('accepts an empty run list', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await expect(listRuns()).resolves.toEqual([]);
  });

  it('rejects a malformed list response', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        runs: [run],
      }),
    );

    await expect(listRuns()).rejects.toThrow('Invalid runs response');
  });

  it('creates a new run', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, run));

    const result = await createRun({
      title: 'Pokémon Y',
      description: 'Randomlocke de sexta generación',
    });

    expect(result.id).toBe(run.id);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/runs',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({
          title: 'Pokémon Y',
          description: 'Randomlocke de sexta generación',
        }),
      }),
    );
  });

  it('updates a run and its status', async () => {
    const updated = {
      ...run,
      status: 'ACTIVE',
      title: 'Pokémon Y Randomlocke',
    };

    fetchMock.mockResolvedValue(jsonResponse(200, updated));

    const result = await updateRun(run.id, {
      title: updated.title,
      status: 'ACTIVE',
    });

    expect(result.status).toBe('ACTIVE');

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/runs/${run.id}`,
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({
          title: updated.title,
          status: 'ACTIVE',
        }),
      }),
    );
  });

  it('deletes a run successfully', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteRun(run.id)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/runs/${run.id}`,
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include',
      }),
    );
  });

  it('rejects unauthenticated requests', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, {
        error: 'UNAUTHORIZED',
      }),
    );

    await expect(listRuns()).rejects.toMatchObject({
      name: 'RunApiError',
      status: 401,
    });
  });

  it('rejects missing runs', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(404, {
        error: 'RUN_NOT_FOUND',
      }),
    );

    await expect(updateRun(run.id, { title: 'Nuevo título' })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('rejects invalid successful API responses', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(201, {
        id: run.id,
        title: 'Pokémon Y',
        status: 'INVALID',
      }),
    );

    await expect(
      createRun({
        title: 'Pokémon Y',
        description: null,
      }),
    ).rejects.toThrow('Invalid create run response');
  });

  it('validates run status values', () => {
    expect(isRun(run)).toBe(true);

    expect(
      isRun({
        ...run,
        status: 'UNKNOWN',
      }),
    ).toBe(false);
  });

  it('preserves HTTP status in API errors', () => {
    const error = new RunApiError('Request failed', 503);

    expect(error.status).toBe(503);
    expect(error.name).toBe('RunApiError');
  });
});
