/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanup, render, screen } from '@testing-library/react';

import { getPokemonVarieties } from '@runvista/pokemon/varieties';

import { EditPokemonDialog } from './EditPokemonDialog';
import { RunPokemonPanel } from './RunPokemonPanel';
import type { RunPokemon } from './pokemon.api';

const apiMocks = vi.hoisted(() => ({
  listRunPokemon: vi.fn(),
}));

vi.mock('./pokemon.api', async (importOriginal) => {
  const original = await importOriginal<typeof import('./pokemon.api')>();

  return {
    ...original,
    listRunPokemon: apiMocks.listRunPokemon,
  };
});

vi.mock('./CreatePokemonForm', () => ({
  CreatePokemonForm: () => null,
}));

vi.mock('./EditPokemonForm', () => ({
  EditPokemonForm: () => null,
}));

const megaX = getPokemonVarieties(6).find((item) => item.name === 'charizard-mega-x')!;

const pokemon: RunPokemon = {
  id: '770e8400-e29b-41d4-a716-446655440000',
  runId: '660e8400-e29b-41d4-a716-446655440000',
  speciesId: 6,
  pokemonId: megaX.pokemonId,
  nickname: 'Draco',
  level: 50,
  isShiny: false,
  status: 'TEAM',
  teamSlot: 1,
  createdAt: '2026-11-23T12:00:00.000Z',
  updatedAt: '2026-11-23T12:00:00.000Z',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Pokemon variety display', () => {
  it('shows the selected variety in the team', async () => {
    apiMocks.listRunPokemon.mockResolvedValue([pokemon]);

    render(<RunPokemonPanel runId={pokemon.runId} />);

    expect(await screen.findByText('Draco')).toBeDefined();

    expect(screen.getByText('Charizard Mega X')).toBeDefined();

    const image = screen.getByRole('img', {
      name: 'Charizard Mega X',
    });

    expect(image.getAttribute('src')).toContain(`/${megaX.pokemonId}.png`);
  });

  it('shows the shiny variety in the box', async () => {
    apiMocks.listRunPokemon.mockResolvedValue([
      {
        ...pokemon,
        status: 'BOX',
        teamSlot: null,
        isShiny: true,
      },
    ]);

    render(<RunPokemonPanel runId={pokemon.runId} />);

    const image = await screen.findByRole('img', {
      name: 'Charizard Mega X shiny',
    });

    expect(image.getAttribute('src')).toContain(`/shiny/${megaX.pokemonId}.png`);

    expect(screen.getByText('Charizard Mega X')).toBeDefined();
  });

  it('shows the selected variety inside the edit dialog', () => {
    const { container } = render(
      <EditPokemonDialog pokemon={pokemon} onUpdated={vi.fn()} onClose={vi.fn()} />,
    );

    const image = container.querySelector('img[alt="Charizard Mega X"]');

    expect(image).not.toBeNull();

    expect(image?.getAttribute('src')).toContain(`/${megaX.pokemonId}.png`);

    expect(container.textContent).toContain('Charizard Mega X');
  });
});
