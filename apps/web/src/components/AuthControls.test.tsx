/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { AuthControls } from './AuthControls';

const user = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  displayName: 'TestStreamer',
  twitchId: '123456789',
};

const mockFetch = vi.fn();

function mockResponse(status: number, payload?: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => payload,
  };
}

describe('AuthControls', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows a loading indicator while checking the session', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<AuthControls />);

    expect(
      screen.getByRole('status', {
        name: 'Comprobando sesión',
      }),
    ).toBeDefined();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      }),
    );
  });

  it('shows the Twitch login link for a guest', async () => {
    mockFetch.mockResolvedValue(mockResponse(401));

    render(<AuthControls />);

    const link = await screen.findByRole('link', {
      name: 'Iniciar con Twitch',
    });

    expect(link.getAttribute('href')).toBe('/api/auth/twitch/login');
  });

  it('shows the authenticated Twitch user', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { user }));

    render(<AuthControls />);

    expect(await screen.findByText('TestStreamer')).toBeDefined();

    expect(screen.getByText('Sesión iniciada')).toBeDefined();

    expect(screen.getByRole('button', { name: 'Salir' })).toBeDefined();
  });

  it('shows a connection error for HTTP 503', async () => {
    mockFetch.mockResolvedValue(mockResponse(503));

    render(<AuthControls />);

    expect(
      await screen.findByRole('button', {
        name: 'Reintentar conexión',
      }),
    ).toBeDefined();
  });

  it('retries the session check when requested', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(503)).mockResolvedValueOnce(mockResponse(401));

    render(<AuthControls />);

    const retry = await screen.findByRole('button', {
      name: 'Reintentar conexión',
    });

    fireEvent.click(retry);

    expect(
      await screen.findByRole('link', {
        name: 'Iniciar con Twitch',
      }),
    ).toBeDefined();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('rejects an invalid authenticated user response', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, {
        user: {
          id: 123,
          displayName: null,
        },
      }),
    );

    render(<AuthControls />);

    expect(
      await screen.findByRole('button', {
        name: 'Reintentar conexión',
      }),
    ).toBeDefined();
  });

  it('logs out and returns to guest mode', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse(200, { user }))
      .mockResolvedValueOnce(mockResponse(204));

    render(<AuthControls />);

    const logout = await screen.findByRole('button', {
      name: 'Salir',
    });

    fireEvent.click(logout);

    expect(
      await screen.findByRole('link', {
        name: 'Iniciar con Twitch',
      }),
    ).toBeDefined();

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
  });

  it('does not claim successful logout when the API fails', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse(200, { user }))
      .mockResolvedValueOnce(mockResponse(503));

    render(<AuthControls />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Salir',
      }),
    );

    expect(
      await screen.findByRole('button', {
        name: 'Reintentar conexión',
      }),
    ).toBeDefined();

    expect(
      screen.queryByRole('link', {
        name: 'Iniciar con Twitch',
      }),
    ).toBeNull();
  });

  it('disables logout while the request is pending', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse(200, { user }))
      .mockImplementationOnce(() => new Promise(() => {}));

    render(<AuthControls />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Salir',
      }),
    );

    const pendingButton = await screen.findByRole('button', { name: 'Cerrando...' });

    expect(pendingButton.hasAttribute('disabled')).toBe(true);

    fireEvent.click(pendingButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
