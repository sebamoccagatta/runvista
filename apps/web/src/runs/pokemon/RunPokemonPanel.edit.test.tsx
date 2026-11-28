/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { listRunPokemon, type RunPokemon } from './pokemon.api';

import { RunPokemonPanel } from './RunPokemonPanel';

vi.mock('./pokemon.api', () => ({
  listRunPokemon: vi.fn(),
  moveRunPokemon: vi.fn(),
  getPokemonErrorMessage: vi.fn(() => 'No pudimos completar la operación.'),
}));

vi.mock('./CreatePokemonForm', () => ({
  CreatePokemonForm: () => <div>Formulario de registro</div>,
}));

vi.mock('./EditPokemonDialog', () => ({
  EditPokemonDialog: ({
    pokemon,
    onUpdated,
    onClose,
  }: {
    pokemon: RunPokemon;
    onUpdated: (pokemon: RunPokemon) => void;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label={`Editar ${pokemon.nickname}`}>
      <button
        type="button"
        onClick={() => {
          onUpdated({
            ...pokemon,
            nickname: 'Nuevo apodo',
            isShiny: true,
          });
          onClose();
        }}
      >
        Simular guardado
      </button>

      <button type="button" onClick={onClose}>
        Simular cancelación
      </button>
    </div>
  ),
}));

const runId = '550e8400-e29b-41d4-a716-446655440000';

const pikachu: RunPokemon = {
  id: '660e8400-e29b-41d4-a716-446655440000',
  runId,
  speciesId: 25,
  nickname: 'Pica',
  level: 25,
  isShiny: false,
  status: 'TEAM',
  teamSlot: 1,
  createdAt: '2026-11-23T12:00:00.000Z',
  updatedAt: '2026-11-23T12:00:00.000Z',
};

beforeEach(() => {
  vi.mocked(listRunPokemon).mockReset();
  vi.mocked(listRunPokemon).mockResolvedValue([pikachu]);
});

afterEach(() => {
  cleanup();
});

describe('RunPokemonPanel editing', () => {
  it('opens the modal without removing card controls', async () => {
    render(<RunPokemonPanel runId={runId} />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Editar Pica',
      }),
    );

    expect(
      screen.getByRole('dialog', {
        name: 'Editar Pica',
      }),
    ).toBeDefined();

    expect(
      screen.getByRole('combobox', {
        name: 'Mover Pica',
      }),
    ).toBeDefined();
  });

  it('reports the list when it loads and again after every change', async () => {
    const onPokemonChange = vi.fn();

    render(<RunPokemonPanel runId={runId} onPokemonChange={onPokemonChange} />);

    await waitFor(() => {
      expect(onPokemonChange).toHaveBeenLastCalledWith([pikachu]);
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Editar Pica' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simular guardado' }));

    await waitFor(() => {
      expect(onPokemonChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ id: pikachu.id, nickname: 'Nuevo apodo' }),
      ]);
    });
  });

  it('closes the modal when cancelling', async () => {
    render(<RunPokemonPanel runId={runId} />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Editar Pica',
      }),
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simular cancelación',
      }),
    );

    expect(
      screen.queryByRole('dialog', {
        name: 'Editar Pica',
      }),
    ).toBeNull();

    expect(
      screen.getByRole('heading', {
        name: 'Pica',
      }),
    ).toBeDefined();
  });

  it('updates the card and shiny sprite after saving', async () => {
    render(<RunPokemonPanel runId={runId} />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Editar Pica',
      }),
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simular guardado',
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: 'Nuevo apodo',
        }),
      ).toBeDefined();
    });

    expect(screen.queryByRole('dialog')).toBeNull();

    const image = screen.getByRole('img', {
      name: 'Pikachu shiny',
    });

    expect(image.getAttribute('src')).toContain('/official-artwork/shiny/25.png');
  });
});
