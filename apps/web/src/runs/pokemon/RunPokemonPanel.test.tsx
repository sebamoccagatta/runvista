/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import {
  getPokemonErrorMessage,
  listRunPokemon,
  moveRunPokemon,
  type RunPokemon,
} from './pokemon.api';

import { RunPokemonPanel } from './RunPokemonPanel';

vi.mock('./pokemon.api', () => ({
  listRunPokemon: vi.fn(),
  moveRunPokemon: vi.fn(),
  getPokemonErrorMessage: vi.fn(() => 'No pudimos completar la operación.'),
}));

const runId = '550e8400-e29b-41d4-a716-446655440000';

const pikachu: RunPokemon = {
  id: '660e8400-e29b-41d4-a716-446655440000',
  runId,
  speciesId: 25,
  nickname: null,
  level: 25,
  isShiny: false,
  status: 'TEAM',
  teamSlot: 1,
  createdAt: '2026-11-23T12:00:00.000Z',
  updatedAt: '2026-11-23T12:00:00.000Z',
};

const greninja: RunPokemon = {
  ...pikachu,
  id: '770e8400-e29b-41d4-a716-446655440000',
  speciesId: 658,
  nickname: 'Ninja',
  level: 42,
  status: 'BOX',
  teamSlot: null,
};

vi.mock('./CreatePokemonForm', () => ({
  CreatePokemonForm: ({ onCreated }: { onCreated: (pokemon: RunPokemon) => void }) => (
    <button type="button" onClick={() => onCreated(greninja)}>
      Simular registro
    </button>
  ),
}));

beforeEach(() => {
  vi.mocked(listRunPokemon).mockReset();
  vi.mocked(moveRunPokemon).mockReset();

  vi.mocked(listRunPokemon).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

describe('RunPokemonPanel', () => {
  it('shows the six empty team slots', async () => {
    render(<RunPokemonPanel runId={runId} />);

    expect(await screen.findByText('Posición 1 libre')).toBeDefined();

    expect(screen.getByText('Posición 6 libre')).toBeDefined();

    expect(screen.getByText('0 / 6')).toBeDefined();
  });

  it('loads Pokemon into their correct sections', async () => {
    vi.mocked(listRunPokemon).mockResolvedValue([pikachu, greninja]);

    render(<RunPokemonPanel runId={runId} />);

    const team = await screen.findByRole('region', {
      name: 'Equipo Pokémon',
    });

    const box = screen.getByRole('region', {
      name: 'Caja Pokémon',
    });

    expect(
      within(team).getByRole('heading', {
        name: 'Pikachu',
      }),
    ).toBeDefined();

    expect(within(box).getByText('Ninja')).toBeDefined();

    expect(screen.getByText('1 / 6')).toBeDefined();
  });

  it('adds a newly registered Pokemon', async () => {
    render(<RunPokemonPanel runId={runId} />);

    await screen.findByText('Posición 1 libre');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Simular registro',
      }),
    );

    const box = screen.getByRole('region', {
      name: 'Caja Pokémon',
    });

    expect(within(box).getByText('Ninja')).toBeDefined();
  });

  it('moves a Pokemon from box into the team', async () => {
    vi.mocked(listRunPokemon).mockResolvedValue([greninja]);

    vi.mocked(moveRunPokemon).mockResolvedValue({
      ...greninja,
      status: 'TEAM',
      teamSlot: 2,
    });

    render(<RunPokemonPanel runId={runId} />);

    const selector = await screen.findByRole('combobox', { name: 'Mover Ninja' });

    fireEvent.change(selector, {
      target: { value: 'TEAM:2' },
    });

    await waitFor(() => {
      expect(moveRunPokemon).toHaveBeenCalledWith(runId, greninja.id, {
        status: 'TEAM',
        teamSlot: 2,
      });
    });

    const team = screen.getByRole('region', {
      name: 'Equipo Pokémon',
    });

    await waitFor(() => {
      expect(within(team).getByText('Ninja')).toBeDefined();
    });
  });

  it('prevents moving to an occupied team slot', async () => {
    vi.mocked(listRunPokemon).mockResolvedValue([pikachu, greninja]);

    render(<RunPokemonPanel runId={runId} />);

    const selector = await screen.findByRole('combobox', { name: 'Mover Ninja' });

    const slotOne = within(selector).getByRole('option', { name: 'Equipo · Posición 1' });

    expect(slotOne).toHaveProperty('disabled', true);
  });

  it('displays errors without losing loaded Pokemon', async () => {
    vi.mocked(listRunPokemon).mockResolvedValue([greninja]);

    vi.mocked(moveRunPokemon).mockRejectedValue(new Error('Conflict'));

    vi.mocked(getPokemonErrorMessage).mockReturnValue('Esa posición del equipo ya está ocupada.');

    render(<RunPokemonPanel runId={runId} />);

    const selector = await screen.findByRole('combobox', { name: 'Mover Ninja' });

    fireEvent.change(selector, {
      target: { value: 'TEAM:1' },
    });

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Esa posición del equipo ya está ocupada.',
    );

    expect(screen.getByText('Ninja')).toBeDefined();
  });
});
