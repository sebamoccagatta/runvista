/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { RunApiError } from '../api/runs.api';

import { getRunConfiguration, saveRunConfiguration } from './configuration.api';

import { RunConfigurationPanel } from './RunConfigurationPanel';

vi.mock('./configuration.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./configuration.api')>();

  return {
    ...actual,
    getRunConfiguration: vi.fn(),
    saveRunConfiguration: vi.fn(),
  };
});

const runId = '550e8400-e29b-41d4-a716-446655440000';

const configuration = {
  runId,
  gameId: 'y',
  challengeType: 'RANDOMLOCKE' as const,
  levelCapIncrease: 0,
  createdAt: '2026-11-22T12:00:00.000Z',
  updatedAt: '2026-11-22T12:00:00.000Z',
};

function renderPanel() {
  return render(<RunConfigurationPanel runId={runId} />);
}

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(getRunConfiguration).mockResolvedValue(configuration);

  vi.mocked(saveRunConfiguration).mockResolvedValue(configuration);
});

afterEach(() => {
  cleanup();
});

describe('RunConfigurationPanel', () => {
  it('shows loading while requesting configuration', () => {
    renderPanel();

    expect(screen.getByText('Cargando configuración...')).toBeDefined();
  });

  it('loads an existing configuration', async () => {
    renderPanel();

    const game = await screen.findByLabelText('Juego Pokémon');

    expect(game).toHaveProperty('value', 'y');

    expect(screen.getByLabelText('Tipo de desafío')).toHaveProperty('value', 'RANDOMLOCKE');

    expect(screen.getByText('Generación 6')).toBeDefined();

    expect(getRunConfiguration).toHaveBeenCalledWith(runId, expect.any(AbortSignal));
  });

  it('allows configuring a new run', async () => {
    vi.mocked(getRunConfiguration).mockResolvedValue(null);

    renderPanel();

    const game = await screen.findByLabelText('Juego Pokémon');

    expect(game).toHaveProperty('value', '');

    expect(screen.getByLabelText('Tipo de desafío')).toHaveProperty('value', 'NORMAL');

    expect(screen.getByText('Esta partida todavía no tiene configuración.')).toBeDefined();

    expect(
      screen.getByRole('button', {
        name: 'Guardar configuración',
      }),
    ).toHaveProperty('disabled', true);
  });

  it('saves the selected game and challenge', async () => {
    vi.mocked(getRunConfiguration).mockResolvedValue(null);

    const updated = {
      ...configuration,
      gameId: 'emerald',
      challengeType: 'NUZLOCKE' as const,
      levelCapIncrease: 0,
    };

    vi.mocked(saveRunConfiguration).mockResolvedValue(updated);

    renderPanel();

    const game = await screen.findByLabelText('Juego Pokémon');

    fireEvent.change(game, {
      target: { value: 'emerald' },
    });

    fireEvent.change(screen.getByLabelText('Tipo de desafío'), {
      target: { value: 'NUZLOCKE' },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Guardar configuración',
      }),
    );

    await waitFor(() => {
      expect(saveRunConfiguration).toHaveBeenCalledWith(runId, {
        gameId: 'emerald',
        challengeType: 'NUZLOCKE',
        levelCapIncrease: 0,
      });
    });

    expect(await screen.findByText('Configuración guardada correctamente.')).toBeDefined();
  });

  it('reports the saved configuration so other panels can refresh', async () => {
    const onSaved = vi.fn();

    render(<RunConfigurationPanel runId={runId} onSaved={onSaved} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Guardar configuración' }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(configuration);
    });
  });

  it('does not report a configuration that failed to save', async () => {
    const onSaved = vi.fn();

    vi.mocked(saveRunConfiguration).mockRejectedValue(new RunApiError('Server error', 500));

    render(<RunConfigurationPanel runId={runId} onSaved={onSaved} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Guardar configuración' }));

    await screen.findByRole('alert');

    expect(onSaved).not.toHaveBeenCalled();
  });

  it('saves a level increase typed by the user', async () => {
    renderPanel();

    const increase = await screen.findByLabelText('Aumento del nivel de los rivales (%)');

    fireEvent.change(increase, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }));

    await waitFor(() => {
      expect(saveRunConfiguration).toHaveBeenCalledWith(
        runId,
        expect.objectContaining({ levelCapIncrease: 10 }),
      );
    });
  });

  it('does not save an increase outside the allowed range', async () => {
    renderPanel();

    const increase = await screen.findByLabelText('Aumento del nivel de los rivales (%)');

    fireEvent.change(increase, { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar configuración' }));

    // El máximo del campo deja que el navegador bloquee el envío antes de llegar a la API.
    await waitFor(() => {
      expect(saveRunConfiguration).not.toHaveBeenCalled();
    });
  });

  it('allows editing an existing configuration', async () => {
    renderPanel();

    const game = await screen.findByLabelText('Juego Pokémon');

    fireEvent.change(game, {
      target: { value: 'omega-ruby' },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Guardar configuración',
      }),
    );

    await waitFor(() => {
      expect(saveRunConfiguration).toHaveBeenCalledWith(runId, {
        gameId: 'omega-ruby',
        challengeType: 'RANDOMLOCKE',
        levelCapIncrease: 0,
      });
    });
  });

  it('shows an error for invalid configuration', async () => {
    vi.mocked(saveRunConfiguration).mockRejectedValue(new RunApiError('Invalid', 400));

    renderPanel();

    await screen.findByLabelText('Juego Pokémon');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Guardar configuración',
      }),
    );

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Revisá el juego y el tipo de desafío.',
    );
  });

  it('shows login when the session expires', async () => {
    vi.mocked(getRunConfiguration).mockRejectedValue(new RunApiError('Unauthorized', 401));

    renderPanel();

    expect(
      await screen.findByText('Necesitás iniciar sesión para editar la configuración.'),
    ).toBeDefined();

    expect(
      screen
        .getByRole('link', {
          name: 'Iniciar con Twitch',
        })
        .getAttribute('href'),
    ).toBe('/api/auth/twitch/login');
  });

  it('shows login when saving returns HTTP 401', async () => {
    vi.mocked(saveRunConfiguration).mockRejectedValue(new RunApiError('Unauthorized', 401));

    renderPanel();

    await screen.findByLabelText('Juego Pokémon');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Guardar configuración',
      }),
    );

    expect(
      await screen.findByText('Necesitás iniciar sesión para editar la configuración.'),
    ).toBeDefined();
  });

  it('handles an unavailable run during save', async () => {
    vi.mocked(saveRunConfiguration).mockRejectedValue(new RunApiError('Not found', 404));

    renderPanel();

    await screen.findByLabelText('Juego Pokémon');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Guardar configuración',
      }),
    );

    expect(await screen.findByText('Esta partida ya no está disponible.')).toBeDefined();
  });

  it('preserves selected data after a failed save', async () => {
    vi.mocked(saveRunConfiguration).mockRejectedValue(new Error('Network error'));

    renderPanel();

    const game = await screen.findByLabelText('Juego Pokémon');

    fireEvent.change(game, {
      target: { value: 'emerald' },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Guardar configuración',
      }),
    );

    expect(
      await screen.findByText('No pudimos guardar la configuración. Intentá nuevamente.'),
    ).toBeDefined();

    expect(screen.getByLabelText('Juego Pokémon')).toHaveProperty('value', 'emerald');
  });

  it('retries loading after a network failure', async () => {
    vi.mocked(getRunConfiguration)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(configuration);

    renderPanel();

    expect(await screen.findByText('No pudimos cargar la configuración.')).toBeDefined();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Reintentar',
      }),
    );

    expect(await screen.findByLabelText('Juego Pokémon')).toHaveProperty('value', 'y');

    expect(getRunConfiguration).toHaveBeenCalledTimes(2);
  });
});
