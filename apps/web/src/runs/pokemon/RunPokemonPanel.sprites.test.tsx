/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cleanup, render, screen, within } from '@testing-library/react';

import { listRunPokemon, type RunPokemon } from './pokemon.api';

import { RunPokemonPanel } from './RunPokemonPanel';

vi.mock('./pokemon.api', () => ({
  listRunPokemon: vi.fn(),
  moveRunPokemon: vi.fn(),
  getPokemonErrorMessage: vi.fn(() => 'No pudimos completar la operación.'),
}));

vi.mock('./CreatePokemonForm', () => ({
  CreatePokemonForm: () => <div>Formulario de prueba</div>,
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
  vi.mocked(listRunPokemon).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
});

describe('RunPokemonPanel sprites', () => {
  it('shows artwork for a team Pokemon', async () => {
    vi.mocked(listRunPokemon).mockResolvedValue([pikachu]);

    render(<RunPokemonPanel runId={runId} />);

    const image = await screen.findByRole('img', {
      name: 'Pikachu',
    });

    expect(image.getAttribute('src')).toContain('/other/official-artwork/25.png');

    expect(screen.getByText('Pica')).toBeDefined();
    expect(screen.getByText('Nv. 25')).toBeDefined();
  });

  it('uses shiny artwork when Pokemon is shiny', async () => {
    vi.mocked(listRunPokemon).mockResolvedValue([
      {
        ...pikachu,
        isShiny: true,
      },
    ]);

    render(<RunPokemonPanel runId={runId} />);

    const image = await screen.findByRole('img', {
      name: 'Pikachu shiny',
    });

    expect(image.getAttribute('src')).toContain('/official-artwork/shiny/25.png');

    expect(screen.getByLabelText('Shiny')).toBeDefined();
  });

  it('visually distinguishes fainted Pokemon', async () => {
    vi.mocked(listRunPokemon).mockResolvedValue([
      {
        ...pikachu,
        status: 'FAINTED',
        teamSlot: null,
      },
    ]);

    render(<RunPokemonPanel runId={runId} />);

    const fainted = await screen.findByRole('region', {
      name: 'Bajas Pokémon',
    });

    expect(within(fainted).getByText('Baja')).toBeDefined();

    const image = within(fainted).getByRole('img', {
      name: 'Pikachu',
    });

    expect(image.parentElement?.className).toContain('grayscale');
  });
});
