/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { updateRunPokemon, type RunPokemon } from './pokemon.api';

import { EditPokemonForm } from './EditPokemonForm';

vi.mock('./pokemon.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./pokemon.api')>();

  return {
    ...actual,
    updateRunPokemon: vi.fn(),
  };
});

const pokemon: RunPokemon = {
  id: '660e8400-e29b-41d4-a716-446655440000',
  runId: '550e8400-e29b-41d4-a716-446655440000',
  speciesId: 25,
  nickname: 'Pica',
  level: 25,
  isShiny: false,
  status: 'TEAM',
  teamSlot: 1,
  createdAt: '2026-11-23T12:00:00.000Z',
  updatedAt: '2026-11-23T12:00:00.000Z',
};

function renderForm(initialPokemon: RunPokemon = pokemon) {
  const onUpdated = vi.fn();
  const onCancel = vi.fn();

  render(<EditPokemonForm pokemon={initialPokemon} onUpdated={onUpdated} onCancel={onCancel} />);

  return { onUpdated, onCancel };
}

function saveChanges() {
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Guardar cambios',
    }),
  );
}

beforeEach(() => {
  vi.mocked(updateRunPokemon).mockReset();
});

afterEach(() => {
  cleanup();
});

describe('EditPokemonForm', () => {
  it('loads the existing Pokemon details', () => {
    renderForm();

    expect(
      screen.getByRole('textbox', {
        name: 'Apodo',
      }),
    ).toHaveProperty('value', 'Pica');

    expect(
      screen.getByRole('spinbutton', {
        name: 'Nivel',
      }),
    ).toHaveProperty('value', '25');

    expect(
      screen.getByRole('checkbox', {
        name: 'Pokémon shiny',
      }),
    ).toHaveProperty('checked', false);
  });

  it('disables saving when nothing changed', () => {
    renderForm();

    expect(
      screen.getByRole('button', {
        name: 'Guardar cambios',
      }),
    ).toHaveProperty('disabled', true);
  });

  it('updates only the nickname', async () => {
    const updated = {
      ...pokemon,
      nickname: 'Chispa',
    };

    vi.mocked(updateRunPokemon).mockResolvedValue(updated);

    const { onUpdated } = renderForm();

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'Apodo',
      }),
      { target: { value: 'Chispa' } },
    );

    saveChanges();

    await waitFor(() => {
      expect(updateRunPokemon).toHaveBeenCalledWith(pokemon.runId, pokemon.id, {
        nickname: 'Chispa',
      });
    });

    expect(onUpdated).toHaveBeenCalledWith(updated);
  });

  it('updates the level', async () => {
    vi.mocked(updateRunPokemon).mockResolvedValue({
      ...pokemon,
      level: 42,
    });

    renderForm();

    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: 'Nivel',
      }),
      { target: { value: '42' } },
    );

    saveChanges();

    await waitFor(() => {
      expect(updateRunPokemon).toHaveBeenCalledWith(pokemon.runId, pokemon.id, { level: 42 });
    });
  });

  it('updates shiny status', async () => {
    vi.mocked(updateRunPokemon).mockResolvedValue({
      ...pokemon,
      isShiny: true,
    });

    renderForm();

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Pokémon shiny',
      }),
    );

    saveChanges();

    await waitFor(() => {
      expect(updateRunPokemon).toHaveBeenCalledWith(pokemon.runId, pokemon.id, { isShiny: true });
    });
  });

  it('allows removing the nickname', async () => {
    vi.mocked(updateRunPokemon).mockResolvedValue({
      ...pokemon,
      nickname: null,
    });

    renderForm();

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'Apodo',
      }),
      { target: { value: '' } },
    );

    saveChanges();

    await waitFor(() => {
      expect(updateRunPokemon).toHaveBeenCalledWith(pokemon.runId, pokemon.id, { nickname: null });
    });
  });

  it('rejects invalid levels', () => {
    renderForm();

    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: 'Nivel',
      }),
      { target: { value: '101' } },
    );

    expect(
      screen.getByRole('button', {
        name: 'Guardar cambios',
      }),
    ).toHaveProperty('disabled', true);

    expect(screen.getByText('El nivel debe estar entre 1 y 100.')).toBeDefined();
  });

  it('notifies when cancelling', () => {
    const { onCancel } = renderForm();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cancelar',
      }),
    );

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows API errors', async () => {
    vi.mocked(updateRunPokemon).mockRejectedValue(new Error('Network error'));

    renderForm();

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'Apodo',
      }),
      { target: { value: 'Nuevo apodo' } },
    );

    saveChanges();

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'No pudimos completar la operación. Intentá nuevamente.',
    );
  });

  it('resets the empty level to null', async () => {
    vi.mocked(updateRunPokemon).mockResolvedValue({
      ...pokemon,
      level: null,
    });

    renderForm();

    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: 'Nivel',
      }),
      { target: { value: '' } },
    );

    saveChanges();

    await waitFor(() => {
      expect(updateRunPokemon).toHaveBeenCalledWith(pokemon.runId, pokemon.id, { level: null });
    });
  });

  it('hides its own heading when embedded', () => {
    render(<EditPokemonForm pokemon={pokemon} onUpdated={vi.fn()} onCancel={vi.fn()} embedded />);

    expect(
      screen.queryByRole('heading', {
        name: 'Editar Pokémon',
      }),
    ).toBeNull();

    expect(
      screen.getByRole('textbox', {
        name: 'Apodo',
      }),
    ).toBeDefined();

    expect(
      screen.getByRole('button', {
        name: 'Guardar cambios',
      }),
    ).toBeDefined();
  });

  it('keeps its heading when used independently', () => {
    renderForm();

    expect(
      screen.getByRole('heading', {
        name: 'Editar Pokémon',
      }),
    ).toBeDefined();
  });
});
