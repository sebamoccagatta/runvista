import { afterEach, describe, expect, it, vi } from 'vitest';

import { deleteRunOverlay, getOverlayErrorMessage } from './overlay.api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('deleteRunOverlay', () => {
  it('deletes the selected overlay using an authenticated request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(deleteRunOverlay('run/1', 'overlay/2')).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/runs/run%2F1/overlays/overlay%2F2', {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-store',
    });
  });

  it('propagates an expired session through the existing error handler', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    const error: unknown = await deleteRunOverlay('run-1', 'overlay-1').catch(
      (cause: unknown) => cause,
    );

    expect(getOverlayErrorMessage(error)).toBe('Tu sesión expiró. Iniciá sesión nuevamente.');
  });

  it('rejects deletion if the overlay is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(deleteRunOverlay('run-1', 'overlay-1')).rejects.toMatchObject({ status: 404 });
  });

  it('does not treat a server failure as a successful deletion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(deleteRunOverlay('run-1', 'overlay-1')).rejects.toMatchObject({ status: 503 });
  });
});
