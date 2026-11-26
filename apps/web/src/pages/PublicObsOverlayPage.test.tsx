// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultOverlayLayout } from '../runs/overlays/overlay.api';
import { PublicObsOverlayPage } from './PublicObsOverlayPage';

vi.mock('../runs/overlays/OverlayRenderer', () => ({
  OverlayRenderer: ({ pokemon }: { pokemon: { nickname: string | null }[] }) => (
    <div>{pokemon.map((member) => member.nickname).join(', ')}</div>
  ),
}));

const token = 'a'.repeat(64);
const endpoint = `/api/obs/overlays/${token}`;
const sources: MockEventSource[] = [];

class MockEventSource extends EventTarget {
  readonly url: string;
  readonly close = vi.fn();

  constructor(url: string) {
    super();
    this.url = url;
    sources.push(this);
  }

  emit(type: string) {
    this.dispatchEvent(new Event(type));
  }
}

const fetchMock = vi.fn<typeof fetch>();

function snapshot(nickname = 'Pikachu original'): Response {
  return new Response(
    JSON.stringify({
      layout: createDefaultOverlayLayout(),
      pokemon: [
        { speciesId: 25, pokemonId: null, nickname, level: 20, isShiny: false, teamSlot: 1 },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function currentSource(): MockEventSource {
  const source = sources.at(-1);
  if (!source) throw new Error('Expected an EventSource connection');
  return source;
}

async function mount(accessToken = token) {
  const view = render(
    <MemoryRouter initialEntries={[`/obs/${accessToken}`]}>
      <Routes>
        <Route path="/obs/:token" element={<PublicObsOverlayPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await act(async () => {});
  return view;
}

async function emit(source: MockEventSource, type: string) {
  await act(async () => {
    source.emit(type);
  });
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  sources.length = 0;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => snapshot());
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('EventSource', MockEventSource);
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('PublicObsOverlayPage', () => {
  it('loads the published team without credentials and opens SSE', async () => {
    await mount();
    expect(screen.getByText('Pikachu original')).toBeTruthy();
    expect(currentSource().url).toBe(`${endpoint}/events`);
    expect(fetchMock).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
      }),
    );
  });

  it('does not request data for malformed tokens', async () => {
    await mount('invalid');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sources).toHaveLength(0);
    expect(screen.queryByRole('main')).toBeNull();
  });

  it('does not poll while SSE is connected', async () => {
    await mount();
    await emit(currentSource(), 'connected');
    const requests = fetchMock.mock.calls.length;
    await advance(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(requests);
    expect(sources).toHaveLength(1);
  });

  it('refreshes the team after an explicit publication event', async () => {
    await mount();
    fetchMock.mockResolvedValueOnce(snapshot('Pikachu actualizado'));
    await emit(currentSource(), 'team-published');
    expect(screen.getByText('Pikachu actualizado')).toBeTruthy();
    expect(screen.queryByText('Pikachu original')).toBeNull();
  });

  it('clears the overlay immediately when access is revoked', async () => {
    await mount();
    const source = currentSource();
    await emit(source, 'access-revoked');
    expect(screen.queryByRole('main')).toBeNull();
    expect(source.close).toHaveBeenCalled();
    await advance(30_000);
    expect(sources).toHaveLength(1);
  });

  it.each([401, 403, 404, 410])('clears the overlay on HTTP %i after SSE fails', async (status) => {
    await mount();
    const source = currentSource();
    fetchMock.mockResolvedValueOnce(new Response(null, { status }));
    await emit(source, 'error');
    expect(screen.queryByRole('main')).toBeNull();
    expect(source.close).toHaveBeenCalled();
    await advance(30_000);
    expect(sources).toHaveLength(1);
  });

  it('keeps the last snapshot during a network failure and reconnects once', async () => {
    await mount();
    const oldSource = currentSource();
    fetchMock.mockRejectedValueOnce(new TypeError('Network unavailable'));
    await emit(oldSource, 'error');
    expect(screen.getByText('Pikachu original')).toBeTruthy();
    expect(oldSource.close).toHaveBeenCalled();
    await emit(oldSource, 'error');
    await advance(9_999);
    expect(sources).toHaveLength(1);
    await advance(1);
    expect(sources).toHaveLength(2);
    fetchMock.mockResolvedValueOnce(snapshot('Equipo recuperado'));
    await emit(currentSource(), 'connected');
    expect(screen.getByText('Equipo recuperado')).toBeTruthy();
    await emit(oldSource, 'access-revoked');
    expect(screen.getByText('Equipo recuperado')).toBeTruthy();
    await advance(30_000);
    expect(sources).toHaveLength(2);
  });

  it('detects a revocation made while disconnected', async () => {
    await mount();
    fetchMock.mockRejectedValueOnce(new TypeError('Offline'));
    await emit(currentSource(), 'error');
    await advance(10_000);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await emit(currentSource(), 'error');
    expect(screen.queryByRole('main')).toBeNull();
    await advance(30_000);
    expect(sources).toHaveLength(2);
  });

  it('does not restore revoked content from a late HTTP response', async () => {
    await mount();
    let resolveResponse!: (response: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    const source = currentSource();
    await emit(source, 'team-published');
    const signal = fetchMock.mock.calls.at(-1)?.[1]?.signal;
    await emit(source, 'access-revoked');
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      resolveResponse(snapshot('Respuesta atrasada'));
    });
    expect(screen.queryByRole('main')).toBeNull();
  });

  it('cancels reconnect timers on unmount', async () => {
    const view = await mount();
    await emit(currentSource(), 'error');
    view.unmount();
    await advance(30_000);
    expect(sources).toHaveLength(1);
  });

  it('closes an active connection and aborts pending requests on unmount', async () => {
    const view = await mount();
    fetchMock.mockImplementationOnce(() => new Promise<Response>(() => {}));
    const source = currentSource();
    await emit(source, 'team-published');
    const signal = fetchMock.mock.calls.at(-1)?.[1]?.signal;
    view.unmount();
    expect(source.close).toHaveBeenCalled();
    expect(signal?.aborted).toBe(true);
    expect(document.documentElement.classList.contains('runvista-overlay-preview')).toBe(false);
  });

  it('retries a failed refresh after a publication and recovers the new team', async () => {
    await mount();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await emit(currentSource(), 'team-published');
    expect(screen.getByText('Pikachu original')).toBeTruthy();

    fetchMock.mockResolvedValueOnce(snapshot('Pikachu recuperado'));
    await advance(5_000);
    expect(screen.getByText('Pikachu recuperado')).toBeTruthy();
    expect(screen.queryByText('Pikachu original')).toBeNull();
  });

  it('retries after an invalid payload without clearing the last team', async () => {
    await mount();
    fetchMock.mockResolvedValueOnce(new Response('{"unexpected":true}', { status: 200 }));
    await emit(currentSource(), 'team-published');
    expect(screen.getByText('Pikachu original')).toBeTruthy();

    fetchMock.mockResolvedValueOnce(snapshot('Pikachu válido'));
    await advance(5_000);
    expect(screen.getByText('Pikachu válido')).toBeTruthy();
  });

  it('does not retry revocation statuses', async () => {
    await mount();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await emit(currentSource(), 'team-published');
    expect(screen.queryByRole('main')).toBeNull();
    const requests = fetchMock.mock.calls.length;
    await advance(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(requests);
  });

  it('cancels a pending refresh retry on unmount', async () => {
    const view = await mount();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await emit(currentSource(), 'team-published');
    const requests = fetchMock.mock.calls.length;
    view.unmount();
    await advance(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(requests);
  });
});
