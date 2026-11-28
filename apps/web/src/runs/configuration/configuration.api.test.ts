import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RunApiError } from '../api/runs.api';

import { getRunConfiguration, saveRunConfiguration } from './configuration.api';

const runId = '550e8400-e29b-41d4-a716-446655440000';

const configuration = {
  runId,
  gameId: 'y',
  challengeType: 'RANDOMLOCKE',
  levelCapIncrease: 10,
  createdAt: '2026-11-22T12:00:00.000Z',
  updatedAt: '2026-11-22T12:00:00.000Z',
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

describe('Run configuration API', () => {
  it('gets an existing configuration', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { configuration }));

    const result = await getRunConfiguration(runId);

    expect(result).toEqual(configuration);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/runs/${runId}/configuration`,
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      }),
    );
  });

  it('accepts an unconfigured run', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { configuration: null }));

    await expect(getRunConfiguration(runId)).resolves.toBeNull();
  });

  it('passes the abort signal to fetch', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { configuration }));

    const controller = new AbortController();

    await getRunConfiguration(runId, controller.signal);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/runs/${runId}/configuration`,
      expect.objectContaining({
        signal: controller.signal,
      }),
    );
  });

  it('saves a configuration using PUT', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { configuration }));

    const input = {
      gameId: 'y',
      challengeType: 'RANDOMLOCKE' as const,
      levelCapIncrease: 10,
    };

    const result = await saveRunConfiguration(runId, input);

    expect(result).toEqual(configuration);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/runs/${runId}/configuration`,
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      }),
    );
  });

  it.each([400, 401, 404, 500])('preserves HTTP %i errors', async (status) => {
    fetchMock.mockResolvedValue(jsonResponse(status, { error: 'REQUEST_FAILED' }));

    await expect(getRunConfiguration(runId)).rejects.toMatchObject({
      name: 'RunApiError',
      status,
    });
  });

  it('rejects a response without configuration', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: configuration }));

    await expect(getRunConfiguration(runId)).rejects.toThrow('Invalid configuration response');
  });

  it('rejects an unknown game from the server', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        configuration: {
          ...configuration,
          gameId: 'pokemon-inventado',
        },
      }),
    );

    await expect(getRunConfiguration(runId)).rejects.toThrow('Invalid configuration response');
  });

  it('rejects configuration belonging to another run', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        configuration: {
          ...configuration,
          runId: '660e8400-e29b-41d4-a716-446655440000',
        },
      }),
    );

    await expect(getRunConfiguration(runId)).rejects.toThrow('Invalid configuration response');
  });

  it('rejects an invalid challenge type', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        configuration: {
          ...configuration,
          challengeType: 'UNKNOWN',
        },
      }),
    );

    await expect(getRunConfiguration(runId)).rejects.toThrow('Invalid configuration response');
  });

  it('rejects null after a successful save', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { configuration: null }));

    await expect(
      saveRunConfiguration(runId, {
        gameId: 'y',
        challengeType: 'NORMAL',
      }),
    ).rejects.toThrow('Invalid save configuration response');
  });

  it('returns a RunApiError for unauthorized saves', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'UNAUTHORIZED' }));

    await expect(
      saveRunConfiguration(runId, {
        gameId: 'y',
        challengeType: 'NORMAL',
      }),
    ).rejects.toBeInstanceOf(RunApiError);
  });
});
