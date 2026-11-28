/**
 * @vitest-environment jsdom
 */

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { POKE_BALLS } from '@runvista/pokemon/pokeballs';

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

    const ball = container.querySelector('svg[data-poke-ball="ultra-ball"]');

    expect(ball).not.toBeNull();
    expect(ball?.getAttribute('aria-hidden')).toBe('true');
  });

  it('paints the ball before the sprite so the sprite stays on top', () => {
    const { container } = render(
      <OverlayRenderer
        layout={createDefaultOverlayLayout()}
        pokemon={[member({ pokeBall: 'master-ball' })]}
      />,
    );

    const ball = container.querySelector('svg[data-poke-ball]');
    const sprite = container.querySelector('img');

    expect(ball).not.toBeNull();
    expect(sprite).not.toBeNull();
    // DOM order decides paint order among positioned siblings.
    expect(ball!.compareDocumentPosition(sprite!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('is larger than the sprite area and anchored to the bottom', () => {
    const { container } = render(
      <OverlayRenderer
        layout={createDefaultOverlayLayout()}
        pokemon={[member({ pokeBall: 'great-ball' })]}
      />,
    );

    const ball = container.querySelector<SVGElement>('svg[data-poke-ball]');

    expect(ball?.getAttribute('class')).toContain('bottom-0');
    expect(ball?.style.height).toBe('115%');
    expect(ball?.style.opacity).toBe('0.85');
  });

  it('draws every catalog ball without errors', () => {
    for (const ball of POKE_BALLS) {
      const { container, unmount } = render(
        <OverlayRenderer
          layout={createDefaultOverlayLayout()}
          pokemon={[member({ pokeBall: ball.key })]}
        />,
      );

      expect(container.querySelector(`svg[data-poke-ball="${ball.key}"]`)).not.toBeNull();

      unmount();
    }
  });

  it('renders no ball when the Pokemon has none', () => {
    const { container } = render(
      <OverlayRenderer layout={createDefaultOverlayLayout()} pokemon={[member()]} />,
    );

    expect(container.querySelector('svg[data-poke-ball]')).toBeNull();
  });

  it('renders no ball for a Pokemon with a null ball', () => {
    const { container } = render(
      <OverlayRenderer
        layout={createDefaultOverlayLayout()}
        pokemon={[member({ pokeBall: null })]}
      />,
    );

    expect(container.querySelector('svg[data-poke-ball]')).toBeNull();
  });
});
