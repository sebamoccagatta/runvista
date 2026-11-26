/**
 * @vitest-environment jsdom
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { OverlayRenderer, type OverlayTeamPokemon } from './OverlayRenderer';
import { createDefaultOverlayLayout } from './overlay.api';

afterEach(() => {
  cleanup();
});

function member(overrides: Partial<OverlayTeamPokemon> = {}): OverlayTeamPokemon {
  return {
    speciesId: 25,
    pokemonId: null,
    nickname: 'Pikachu',
    level: 20,
    isShiny: false,
    teamSlot: 1,
    ...overrides,
  };
}

describe('OverlayRenderer Poke Ball', () => {
  it('draws the ball as a decorative layer behind the sprite', () => {
    const { container } = render(
      <OverlayRenderer
        layout={createDefaultOverlayLayout()}
        pokemon={[member({ pokeBall: 'ultra-ball' })]}
      />,
    );

    const ball = container.querySelector('img[src$="ultra-ball.png"]');

    expect(ball).not.toBeNull();
    expect(ball?.getAttribute('aria-hidden')).toBe('true');
    expect(ball?.getAttribute('alt')).toBe('');
  });

  it('renders no ball when the Pokemon has none', () => {
    const { container } = render(
      <OverlayRenderer layout={createDefaultOverlayLayout()} pokemon={[member()]} />,
    );

    expect(container.querySelector('img[src*="/items/"]')).toBeNull();
  });

  it('renders no ball for a Pokemon with a null ball', () => {
    const { container } = render(
      <OverlayRenderer
        layout={createDefaultOverlayLayout()}
        pokemon={[member({ pokeBall: null })]}
      />,
    );

    expect(container.querySelector('img[src*="/items/"]')).toBeNull();
  });
});
