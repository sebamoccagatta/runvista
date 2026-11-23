/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from 'vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { getPokemonVarieties } from '@runvista/pokemon/varieties';

import { getPokemonSpriteUrls } from './pokemon-sprites';
import { PokemonSprite } from './PokemonSprite';

const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

const megaX = getPokemonVarieties(6).find((item) => item.name === 'charizard-mega-x')!;

const megaY = getPokemonVarieties(6).find((item) => item.name === 'charizard-mega-y')!;

afterEach(() => {
  cleanup();
});

describe('PokemonSprite alternative varieties', () => {
  it('generates variety artwork URLs', () => {
    expect(getPokemonSpriteUrls(6, false, megaX.pokemonId)).toEqual([
      `${BASE}/other/official-artwork/${megaX.pokemonId}.png`,
      `${BASE}/${megaX.pokemonId}.png`,
      `${BASE}/other/official-artwork/6.png`,
      `${BASE}/6.png`,
    ]);
  });

  it('generates shiny artwork URLs', () => {
    const urls = getPokemonSpriteUrls(6, true, megaX.pokemonId);

    expect(urls).toEqual([
      `${BASE}/other/official-artwork/shiny/${megaX.pokemonId}.png`,
      `${BASE}/shiny/${megaX.pokemonId}.png`,
      `${BASE}/other/official-artwork/shiny/6.png`,
      `${BASE}/shiny/6.png`,
    ]);
  });

  it('renders the selected Mega Charizard X', () => {
    render(<PokemonSprite speciesId={6} pokemonId={megaX.pokemonId} />);

    const image = screen.getByRole('img', {
      name: 'Charizard Mega X',
    });

    expect(image.getAttribute('src')).toBe(`${BASE}/other/official-artwork/${megaX.pokemonId}.png`);
  });

  it('falls back to the variety traditional sprite', () => {
    render(<PokemonSprite speciesId={6} pokemonId={megaX.pokemonId} />);

    fireEvent.error(
      screen.getByRole('img', {
        name: 'Charizard Mega X',
      }),
    );

    expect(
      screen
        .getByRole('img', {
          name: 'Charizard Mega X',
        })
        .getAttribute('src'),
    ).toBe(`${BASE}/${megaX.pokemonId}.png`);
  });

  it('falls back to the base species artwork', () => {
    render(<PokemonSprite speciesId={6} pokemonId={megaX.pokemonId} />);

    for (let i = 0; i < 2; i++) {
      fireEvent.error(
        screen.getByRole('img', {
          name: 'Charizard Mega X',
        }),
      );
    }

    expect(
      screen
        .getByRole('img', {
          name: 'Charizard Mega X',
        })
        .getAttribute('src'),
    ).toBe(`${BASE}/other/official-artwork/6.png`);
  });

  it('resets its source when the variety changes', () => {
    const { rerender } = render(<PokemonSprite speciesId={6} pokemonId={megaX.pokemonId} />);

    fireEvent.error(
      screen.getByRole('img', {
        name: 'Charizard Mega X',
      }),
    );

    rerender(<PokemonSprite speciesId={6} pokemonId={megaY.pokemonId} />);

    expect(
      screen
        .getByRole('img', {
          name: 'Charizard Mega Y',
        })
        .getAttribute('src'),
    ).toBe(`${BASE}/other/official-artwork/${megaY.pokemonId}.png`);
  });

  it('falls back to the default form for invalid IDs', () => {
    expect(getPokemonSpriteUrls(6, false, 999999)).toEqual([
      `${BASE}/other/official-artwork/6.png`,
      `${BASE}/6.png`,
    ]);
  });

  it('keeps existing Pokemon sprites compatible', () => {
    expect(getPokemonSpriteUrls(25)).toEqual([
      `${BASE}/other/official-artwork/25.png`,
      `${BASE}/25.png`,
    ]);

    expect(getPokemonSpriteUrls(25, true, null)).toEqual([
      `${BASE}/other/official-artwork/shiny/25.png`,
      `${BASE}/shiny/25.png`,
    ]);
  });
});
