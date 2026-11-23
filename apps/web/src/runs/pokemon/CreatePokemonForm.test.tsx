/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CreatePokemonForm } from './CreatePokemonForm';

const runId = '550e8400-e29b-41d4-a716-446655440000';

const createdPokemon = {
  id: '660e8400-e29b-41d4-a716-446655440000',
  runId,
  speciesId: 658,
  nickname: null,
  level: null,
  isShiny: false,
  status: 'BOX',
  teamSlot: null,
  createdAt: '2026-11-23T12:00:00.000Z',
  updatedAt: '2026-11-23T12:00:00.000Z',
};

const fetchMock = vi.fn();

function selectGreninja() {
  const speciesInput = screen.getByRole('combobox', {
    name: 'Especie Pokémon',
  });

  fireEvent.change(speciesInput, {
    target: { value: 'Greninja' },
  });

  fireEvent.click(
    screen.getByRole('option', {
      name: /Greninja/,
    }),
  );
}

function mockSuccess(pokemon: typeof createdPokemon = createdPokemon) {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ pokemon }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CreatePokemonForm', () => {
  it('starts with box as the default destination', () => {
    render(<CreatePokemonForm runId={runId} onCreated={vi.fn()} />);

    expect(
      screen.getByRole('combobox', {
        name: 'Destino inicial',
      }),
    ).toHaveProperty('value', 'BOX');
  });

  it('requires selecting a species', () => {
    render(<CreatePokemonForm runId={runId} onCreated={vi.fn()} />);

    expect(
      screen.getByRole('button', {
        name: 'Registrar Pokémon',
      }),
    ).toHaveProperty('disabled', true);
  });

  it('creates a Pokemon in the box', async () => {
    mockSuccess();

    const onCreated = vi.fn();

    render(<CreatePokemonForm runId={runId} onCreated={onCreated} />);

    selectGreninja();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Registrar Pokémon',
      }),
    );

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(createdPokemon);
    });

    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(requestOptions?.method).toBe('POST');

    expect(JSON.parse(String(requestOptions?.body))).toEqual({
      speciesId: 658,
      nickname: null,
      level: null,
      isShiny: false,
      status: 'BOX',
    });
  });

  it('creates a Pokemon in a chosen team slot', async () => {
    const pokemon = {
      ...createdPokemon,
      status: 'TEAM',
      teamSlot: 2,
    };

    mockSuccess(pokemon);

    const onCreated = vi.fn();

    render(<CreatePokemonForm runId={runId} onCreated={onCreated} />);

    selectGreninja();

    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Destino inicial',
      }),
      { target: { value: 'TEAM' } },
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Posición 2',
      }),
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Registrar Pokémon',
      }),
    );

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith(pokemon);
    });

    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(JSON.parse(String(requestOptions?.body)).teamSlot).toBe(2);
  });

  it('disables occupied team slots', () => {
    render(<CreatePokemonForm runId={runId} onCreated={vi.fn()} occupiedSlots={[1, 3]} />);

    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Destino inicial',
      }),
      { target: { value: 'TEAM' } },
    );

    expect(
      screen.getByRole('button', {
        name: 'Posición 1, ocupada',
      }),
    ).toHaveProperty('disabled', true);

    expect(
      screen.getByRole('button', {
        name: 'Posición 2',
      }),
    ).toHaveProperty('disabled', false);
  });

  it('rejects an invalid level', () => {
    render(<CreatePokemonForm runId={runId} onCreated={vi.fn()} />);

    selectGreninja();

    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: 'Nivel',
      }),
      { target: { value: '101' } },
    );

    expect(
      screen.getByRole('button', {
        name: 'Registrar Pokémon',
      }),
    ).toHaveProperty('disabled', true);
  });

  it('sends nickname, level and shiny', async () => {
    mockSuccess({
      ...createdPokemon,
      nickname: 'Ninja',
      level: 42,
      isShiny: true,
    });

    render(<CreatePokemonForm runId={runId} onCreated={vi.fn()} />);

    selectGreninja();

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'Apodo',
      }),
      { target: { value: 'Ninja' } },
    );

    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: 'Nivel',
      }),
      { target: { value: '42' } },
    );

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Pokémon shiny',
      }),
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Registrar Pokémon',
      }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const requestOptions = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(JSON.parse(String(requestOptions?.body))).toMatchObject({
      nickname: 'Ninja',
      level: 42,
      isShiny: true,
    });
  });

  it('shows an occupied slot conflict', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'CONFLICT' }), { status: 409 }),
    );

    render(<CreatePokemonForm runId={runId} onCreated={vi.fn()} />);

    selectGreninja();

    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Destino inicial',
      }),
      { target: { value: 'TEAM' } },
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Posición 1',
      }),
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Registrar Pokémon',
      }),
    );

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Esa posición del equipo ya está ocupada.',
    );
  });

  it('resets fields using the clear button', () => {
    render(<CreatePokemonForm runId={runId} onCreated={vi.fn()} />);

    selectGreninja();

    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'Apodo',
      }),
      { target: { value: 'Ninja' } },
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Limpiar',
      }),
    );

    expect(
      screen.getByRole('combobox', {
        name: 'Especie Pokémon',
      }),
    ).toHaveProperty('value', '');

    expect(
      screen.getByRole('textbox', {
        name: 'Apodo',
      }),
    ).toHaveProperty('value', '');
  });
});
