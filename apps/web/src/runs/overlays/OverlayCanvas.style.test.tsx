/**
 * @vitest-environment jsdom
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { RunPokemon } from '../pokemon/pokemon.api';
import { OverlayCanvas } from './OverlayCanvas';
import { createDefaultOverlayLayout } from './overlay.api';

afterEach(() => {
  cleanup();
});

function pokemon(slot: number, overrides: Partial<RunPokemon> = {}): RunPokemon {
  return {
    id: `pokemon-${slot}`,
    runId: 'run',
    speciesId: 25,
    pokemonId: null,
    nickname: `Pika${slot}`,
    level: 20,
    isShiny: false,
    pokeBall: null,
    status: 'TEAM',
    teamSlot: slot,
    createdAt: '2026-11-26T00:00:00.000Z',
    updatedAt: '2026-11-26T00:00:00.000Z',
    ...overrides,
  };
}

function renderCanvas(layout = createDefaultOverlayLayout(), team: RunPokemon[] = [pokemon(1)]) {
  return render(
    <OverlayCanvas
      layout={layout}
      pokemon={team}
      selectedSlot={1}
      onSelectSlot={vi.fn()}
      onChange={vi.fn()}
    />,
  );
}

/** El rótulo contiene el apodo; la tarjeta es su contenedor. */
function parts(nickname: string) {
  const label = screen.getByText(nickname).parentElement as HTMLElement;
  const card = label.parentElement as HTMLElement;

  return { label, card };
}

describe('OverlayCanvas reflects the overlay style', () => {
  it('draws the default label as white text on 65 % black', () => {
    renderCanvas();

    const { label } = parts('Pika1');

    expect(label.style.backgroundColor).toBe('rgba(0, 0, 0, 0.65)');
    expect(label.style.color).toBe('rgb(255, 255, 255)');
  });

  it('uses the common label style', () => {
    const layout = createDefaultOverlayLayout();
    layout.style.label.color = '#ffcc00';
    layout.style.label.background = '#112233';
    layout.style.label.backgroundOpacity = 0.5;

    renderCanvas(layout);

    const { label } = parts('Pika1');

    expect(label.style.color).toBe('rgb(255, 204, 0)');
    expect(label.style.backgroundColor).toBe('rgba(17, 34, 51, 0.5)');
  });

  it('applies a position override only to that position', () => {
    const layout = createDefaultOverlayLayout();
    layout.elements[1]!.style = { label: { color: '#ff0000' } };

    renderCanvas(layout, [pokemon(1), pokemon(2)]);

    expect(parts('Pika1').label.style.color).toBe('rgb(255, 255, 255)');
    expect(parts('Pika2').label.style.color).toBe('rgb(255, 0, 0)');
  });

  it('paints the card background only when it has opacity', () => {
    const layout = createDefaultOverlayLayout();

    const { unmount } = renderCanvas(layout);

    expect(parts('Pika1').card.style.backgroundColor).toBe('');
    expect(parts('Pika1').card.className).toContain('bg-cyan-400/10');

    unmount();

    layout.style.card.background = '#112233';
    layout.style.card.backgroundOpacity = 0.5;

    renderCanvas(layout);

    expect(parts('Pika1').card.style.backgroundColor).toBe('rgba(17, 34, 51, 0.5)');
    expect(parts('Pika1').card.className).not.toContain('bg-cyan-400/10');
  });
});

describe('OverlayCanvas Poke Ball', () => {
  it('draws no ball for a Pokemon without one', () => {
    renderCanvas();

    expect(document.querySelector('svg[data-poke-ball]')).toBeNull();
  });

  it('draws the ball behind the artwork', () => {
    renderCanvas(createDefaultOverlayLayout(), [pokemon(1, { pokeBall: 'great-ball' })]);

    const ball = document.querySelector('svg[data-poke-ball="great-ball"]');
    const artwork = document.querySelector('img');

    expect(ball).not.toBeNull();
    expect(artwork).not.toBeNull();
    expect(ball!.compareDocumentPosition(artwork!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('uses the ball opacity and scale from the style', () => {
    const layout = createDefaultOverlayLayout();
    layout.elements[0]!.style = { ball: { opacity: 0.3, scale: 1.4 } };

    renderCanvas(layout, [pokemon(1, { pokeBall: 'ultra-ball' })]);

    const ball = document.querySelector<SVGElement>('svg[data-poke-ball="ultra-ball"]');

    expect(ball?.style.opacity).toBe('0.3');
    expect(ball?.style.height).toBe('140%');
  });

  it('does not let the ball intercept dragging', () => {
    renderCanvas(createDefaultOverlayLayout(), [pokemon(1, { pokeBall: 'great-ball' })]);

    const ball = document.querySelector('svg[data-poke-ball]');

    expect(ball?.getAttribute('class')).toContain('pointer-events-none');
  });
});
