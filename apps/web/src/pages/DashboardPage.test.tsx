/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { createRun, deleteRun, listRuns, RunApiError, updateRun } from '../runs/api/runs.api';
import type { Run } from '../runs/types';
import { MemoryRouter } from 'react-router';
import { DashboardPage } from './DashboardPage';

vi.mock('../runs/api/runs.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../runs/api/runs.api')>();

  return {
    ...actual,
    listRuns: vi.fn(),
    createRun: vi.fn(),
    updateRun: vi.fn(),
    deleteRun: vi.fn(),
  };
});

const run: Run = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  ownerId: '650e8400-e29b-41d4-a716-446655440000',
  title: 'Pokémon Y',
  description: 'Randomlocke',
  status: 'DRAFT',
  createdAt: '2026-11-21T20:00:00.000Z',
  updatedAt: '2026-11-21T20:00:00.000Z',
};

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <DashboardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listRuns).mockResolvedValue([run]);
});

afterEach(() => {
  cleanup();
});

describe('DashboardPage', () => {
  it('loads and displays the users runs', async () => {
    renderDashboard();

    expect(
      screen.getByRole('status', {
        name: 'Cargando partidas',
      }),
    ).toBeDefined();

    expect(await screen.findByText('Pokémon Y')).toBeDefined();

    expect(screen.getByText('Borrador')).toBeDefined();

    expect(listRuns).toHaveBeenCalledOnce();
  });

  it('shows the empty state when there are no runs', async () => {
    vi.mocked(listRuns).mockResolvedValue([]);

    renderDashboard();

    expect(await screen.findByText('Tu próxima aventura comienza acá')).toBeDefined();

    expect(
      screen.getByRole('button', {
        name: 'Crear mi primera partida',
      }),
    ).toBeDefined();
  });

  it('shows login when the session is missing', async () => {
    vi.mocked(listRuns).mockRejectedValue(new RunApiError('Unauthorized', 401));

    renderDashboard();

    expect(await screen.findByText('Tus aventuras te esperan')).toBeDefined();

    expect(
      screen
        .getByRole('link', {
          name: 'Iniciar con Twitch',
        })
        .getAttribute('href'),
    ).toBe('/api/auth/twitch/login');
  });

  it('retries loading after an API failure', async () => {
    vi.mocked(listRuns)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([run]);

    renderDashboard();

    expect(await screen.findByText('No pudimos cargar tus partidas')).toBeDefined();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Reintentar',
      }),
    );

    expect(await screen.findByText('Pokémon Y')).toBeDefined();

    expect(listRuns).toHaveBeenCalledTimes(2);
  });

  it('creates a run and updates the list', async () => {
    vi.mocked(listRuns).mockResolvedValue([]);

    const created: Run = {
      ...run,
      title: 'Pokémon Esmeralda',
    };

    vi.mocked(createRun).mockResolvedValue(created);

    renderDashboard();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Crear mi primera partida',
      }),
    );

    fireEvent.change(screen.getByLabelText('Nombre de la partida'), {
      target: { value: 'Pokémon Esmeralda' },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Crear partida',
      }),
    );

    await waitFor(() => {
      expect(createRun).toHaveBeenCalledWith({
        title: 'Pokémon Esmeralda',
        description: null,
      });
    });

    expect(await screen.findByText('Pokémon Esmeralda')).toBeDefined();
  });

  it('edits a run and updates its status', async () => {
    const updated: Run = {
      ...run,
      title: 'Pokémon Y Randomlocke',
      status: 'ACTIVE',
    };

    vi.mocked(updateRun).mockResolvedValue(updated);

    renderDashboard();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Editar Pokémon Y',
      }),
    );

    fireEvent.change(screen.getByLabelText('Nombre de la partida'), {
      target: { value: updated.title },
    });

    fireEvent.change(screen.getByLabelText('Estado de la partida'), {
      target: { value: 'ACTIVE' },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Guardar cambios',
      }),
    );

    await waitFor(() => {
      expect(updateRun).toHaveBeenCalledWith(
        run.id,
        expect.objectContaining({
          title: updated.title,
          status: 'ACTIVE',
        }),
      );
    });

    expect(await screen.findByText(updated.title)).toBeDefined();

    expect(screen.getByText('En curso')).toBeDefined();
  });

  it('preserves form data when updating fails', async () => {
    vi.mocked(updateRun).mockRejectedValue(new RunApiError('Server error', 500));

    renderDashboard();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Editar Pokémon Y',
      }),
    );

    fireEvent.change(screen.getByLabelText('Nombre de la partida'), {
      target: { value: 'Nuevo nombre' },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Guardar cambios',
      }),
    );

    expect(await screen.findByRole('alert')).toBeDefined();

    expect(screen.getByLabelText('Nombre de la partida')).toHaveProperty('value', 'Nuevo nombre');

    expect(
      screen.getByRole('button', {
        name: 'Guardar cambios',
      }),
    ).toBeDefined();
  });

  it('does not delete a run when cancellation is selected', async () => {
    renderDashboard();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Eliminar Pokémon Y',
      }),
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cancelar',
      }),
    );

    expect(deleteRun).not.toHaveBeenCalled();

    expect(screen.getByText('Pokémon Y')).toBeDefined();
  });

  it('deletes a run only after API confirmation', async () => {
    vi.mocked(deleteRun).mockResolvedValue(undefined);

    renderDashboard();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Eliminar Pokémon Y',
      }),
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Eliminar partida',
      }),
    );

    await waitFor(() => {
      expect(deleteRun).toHaveBeenCalledWith(run.id);
    });

    expect(await screen.findByText('Tu próxima aventura comienza acá')).toBeDefined();

    expect(screen.queryByText('Pokémon Y')).toBeNull();
  });

  it('preserves the run when deletion fails', async () => {
    vi.mocked(deleteRun).mockRejectedValue(new RunApiError('Server error', 500));

    renderDashboard();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Eliminar Pokémon Y',
      }),
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Eliminar partida',
      }),
    );

    expect(await screen.findByRole('alert')).toBeDefined();

    expect(screen.getByRole('alertdialog')).toBeDefined();

    expect(
      screen.getByRole('button', {
        name: 'Editar Pokémon Y',
      }),
    ).toBeDefined();
  });
});
