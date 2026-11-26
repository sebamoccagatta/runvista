/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from 'vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { getPokemonSpriteUrls } from './pokemon-sprites';
import { PokemonSprite } from './PokemonSprite';

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

afterEach(() => {
  cleanup();
});

describe('PokemonSprite', () => {
  it('generates normal image URLs', () => {
    expect(getPokemonSpriteUrls(25)).toEqual([
      `${SPRITE_BASE}/other/official-artwork/25.png`,
      `${SPRITE_BASE}/25.png`,
    ]);
  });

  it('generates shiny image URLs', () => {
    expect(getPokemonSpriteUrls(658, true)).toEqual([
      `${SPRITE_BASE}/other/official-artwork/shiny/658.png`,
      `${SPRITE_BASE}/shiny/658.png`,
    ]);
  });

  it('rejects unknown species identifiers', () => {
    expect(getPokemonSpriteUrls(9999)).toEqual([]);
    expect(getPokemonSpriteUrls(-1)).toEqual([]);
  });

  it('renders a normal Pokemon image', () => {
    render(<PokemonSprite speciesId={25} />);

    const image = screen.getByRole('img', {
      name: 'Pikachu',
    });

    expect(image.getAttribute('src')).toBe(`${SPRITE_BASE}/other/official-artwork/25.png`);
  });

  it('renders the shiny variant', () => {
    render(<PokemonSprite speciesId={658} isShiny />);

    const image = screen.getByRole('img', {
      name: 'Greninja shiny',
    });

    expect(image.getAttribute('src')).toBe(`${SPRITE_BASE}/other/official-artwork/shiny/658.png`);
  });

  it('falls back to a traditional sprite', () => {
    render(<PokemonSprite speciesId={25} />);

    const image = screen.getByRole('img', {
      name: 'Pikachu',
    });

    fireEvent.error(image);

    expect(image.getAttribute('src')).toBe(`${SPRITE_BASE}/25.png`);
  });

  it('shows a placeholder when all images fail', () => {
    render(<PokemonSprite speciesId={25} isShiny />);

    fireEvent.error(
      screen.getByRole('img', {
        name: 'Pikachu shiny',
      }),
    );

    fireEvent.error(
      screen.getByRole('img', {
        name: 'Pikachu shiny',
      }),
    );

    expect(
      screen.getByRole('img', {
        name: 'Imagen no disponible: Pikachu shiny',
      }),
    ).toBeDefined();

    expect(screen.getByText('#0025')).toBeDefined();
  });

  it('shows a placeholder for an unknown species', () => {
    render(<PokemonSprite speciesId={9999} />);

    expect(
      screen.getByRole('img', {
        name: 'Imagen no disponible: Pokémon #9999',
      }),
    ).toBeDefined();
  });

  it('resets the image source when species changes', () => {
    const { rerender } = render(<PokemonSprite speciesId={25} />);

    fireEvent.error(
      screen.getByRole('img', {
        name: 'Pikachu',
      }),
    );

    rerender(<PokemonSprite speciesId={658} />);

    const image = screen.getByRole('img', {
      name: 'Greninja',
    });

    expect(image.getAttribute('src')).toBe(`${SPRITE_BASE}/other/official-artwork/658.png`);
  });

  it('resets the image source when shiny changes', () => {
    const { rerender } = render(<PokemonSprite speciesId={25} />);

    fireEvent.error(
      screen.getByRole('img', {
        name: 'Pikachu',
      }),
    );

    rerender(<PokemonSprite speciesId={25} isShiny />);

    const image = screen.getByRole('img', {
      name: 'Pikachu shiny',
    });

    expect(image.getAttribute('src')).toBe(`${SPRITE_BASE}/other/official-artwork/shiny/25.png`);
  });

  it('starts from the first source when the species changes after a failed fallback', () => {
    const { rerender } = render(<PokemonSprite speciesId={25} />);

    const first = screen.getByRole('img', { name: 'Pikachu' });
    fireEvent.error(first);
    expect(first.getAttribute('src')).toBe(`${SPRITE_BASE}/25.png`);

    rerender(<PokemonSprite speciesId={1} />);

    const next = screen.getByRole('img', { name: /Bulbasaur/ });
    expect(next.getAttribute('src')).toBe(`${SPRITE_BASE}/other/official-artwork/1.png`);
  });
});
