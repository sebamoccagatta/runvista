/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { getRun, RunApiError } from '../runs/api/runs.api';
import type { Run } from '../runs/types';
import { RunDetailsPage } from './RunDetailsPage';

vi.mock('../runs/api/runs.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../runs/api/runs.api')>();

  return {
    ...actual,
    getRun: vi.fn(),
  };
});

vi.mock('../runs/configuration/RunConfigurationPanel', () => ({
  RunConfigurationPanel: () => (
    <section>
      <h3>Configuración</h3>
    </section>
  ),
}));

const run: Run = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  ownerId: '650e8400-e29b-41d4-a716-446655440000',
  title: 'Pokémon Y',
  description: 'Randomlocke de sexta generación',
  status: 'ACTIVE',
  createdAt: '2026-11-21T20:00:00.000Z',
  updatedAt: '2026-11-22T01:00:00.000Z',
};

function renderDetails(path = `/app/runs/${run.id}`) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/runs/:id" element={<RunDetailsPage />} />
        <Route path="/app" element={<div>Dashboard de prueba</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getRun).mockResolvedValue(run);
});

afterEach(() => {
  cleanup();
});

describe('RunDetailsPage', () => {
  it('shows a loading state initially', () => {
    renderDetails();

    expect(
      screen.getByRole('status', {
        name: 'Cargando detalle de partida',
      }),
    ).toBeDefined();
  });

  it('loads the selected run by its ID', async () => {
    renderDetails();

    expect(
      await screen.findByRole('heading', {
        name: 'Pokémon Y',
      }),
    ).toBeDefined();

    expect(getRun).toHaveBeenCalledWith(run.id, expect.any(AbortSignal));

    expect(screen.getByText('Randomlocke de sexta generación')).toBeDefined();

    expect(screen.getByText('En curso')).toBeDefined();
  });

  it('renders the four planned adventure modules', async () => {
    renderDetails();

    await screen.findByRole('heading', {
      name: 'Pokémon Y',
    });

    for (const title of ['Configuración', 'Equipo Pokémon', 'Capturas', 'Progreso']) {
      expect(
        screen.getByRole('heading', {
          name: title,
        }),
      ).toBeDefined();
    }

    expect(screen.getAllByText('Próximamente')).toHaveLength(3);
  });

  it('shows the missing description fallback', async () => {
    vi.mocked(getRun).mockResolvedValue({
      ...run,
      description: null,
    });

    renderDetails();

    expect(
      await screen.findByText('Esta aventura todavía no tiene una descripción.'),
    ).toBeDefined();
  });

  it('shows authentication instructions on HTTP 401', async () => {
    vi.mocked(getRun).mockRejectedValue(new RunApiError('Unauthorized', 401));

    renderDetails();

    expect(await screen.findByText('Iniciá sesión para continuar')).toBeDefined();

    expect(
      screen
        .getByRole('link', {
          name: 'Iniciar con Twitch',
        })
        .getAttribute('href'),
    ).toBe('/api/auth/twitch/login');
  });

  it.each([400, 404])('shows not found for HTTP %i', async (status) => {
    vi.mocked(getRun).mockRejectedValue(new RunApiError('Not found', status));

    renderDetails();

    expect(
      await screen.findByRole('heading', {
        name: 'No encontramos esta partida',
      }),
    ).toBeDefined();
  });

  it('retries when loading fails', async () => {
    vi.mocked(getRun)
      .mockRejectedValueOnce(new RunApiError('Server error', 500))
      .mockResolvedValueOnce(run);

    renderDetails();

    expect(await screen.findByText('No pudimos cargar la partida')).toBeDefined();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Reintentar',
      }),
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Pokémon Y',
      }),
    ).toBeDefined();

    expect(getRun).toHaveBeenCalledTimes(2);
  });

  it('navigates back to the dashboard', async () => {
    renderDetails();

    await screen.findByRole('heading', {
      name: 'Pokémon Y',
    });

    fireEvent.click(
      screen.getByRole('link', {
        name: 'Mis partidas',
      }),
    );

    expect(await screen.findByText('Dashboard de prueba')).toBeDefined();
  });
});
