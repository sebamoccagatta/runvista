/**
 * @vitest-environment jsdom
 */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { FONT_FAMILY_STACKS } from '@runvista/overlay-engine';

import { OverlayRenderer, type OverlayTeamPokemon } from './OverlayRenderer';
import { createDefaultOverlayLayout } from './overlay.api';

afterEach(() => {
  cleanup();
});

function member(slot: number, nickname: string, overrides: Partial<OverlayTeamPokemon> = {}) {
  return {
    speciesId: 25,
    pokemonId: null,
    nickname,
    level: 20,
    isShiny: false,
    teamSlot: slot,
    ...overrides,
  } satisfies OverlayTeamPokemon;
}

/** jsdom quita las comillas de los nombres de fuente al leer el estilo. */
function normalizeFont(value: string): string {
  return value.replace(/"/g, '');
}

/** El rótulo es el contenedor del texto del nombre; la tarjeta es su padre. */
function parts(nickname: string) {
  const label = screen.getByText(nickname).parentElement as HTMLElement;
  const card = label.parentElement as HTMLElement;

  return { label, card };
}

describe('OverlayRenderer default style matches the previous appearance', () => {
  it('draws the label as 36 px white text on 65 % black', () => {
    render(<OverlayRenderer layout={createDefaultOverlayLayout()} pokemon={[member(1, 'Pika')]} />);

    const { label } = parts('Pika');

    expect(label.style.backgroundColor).toBe('rgba(0, 0, 0, 0.65)');
    expect(label.style.color).toBe('rgb(255, 255, 255)');
    expect(label.style.fontSize).toBe('36px');
    expect(normalizeFont(label.style.fontFamily)).toBe(normalizeFont(FONT_FAMILY_STACKS.sans));
    // jsdom reordena la sombra al leerla: color primero, luego los desplazamientos.
    expect(label.style.textShadow).toBe('rgba(0, 0, 0, 0.8) 0px 2px 4px');
  });

  it('draws the level line at 24 px with 90 % opacity', () => {
    render(<OverlayRenderer layout={createDefaultOverlayLayout()} pokemon={[member(1, 'Pika')]} />);

    const level = screen.getByText('Nv. 20');

    expect(level.style.fontSize).toBe('24px');
    expect(level.style.opacity).toBe('0.9');
  });

  it('draws the card without background or border', () => {
    render(<OverlayRenderer layout={createDefaultOverlayLayout()} pokemon={[member(1, 'Pika')]} />);

    const { card } = parts('Pika');

    expect(card.style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(card.style.border).toBe('');
    expect(card.style.borderRadius).toBe('0px');
  });

  it('draws the ball at 115 % height and 85 % opacity', () => {
    render(
      <OverlayRenderer
        layout={createDefaultOverlayLayout()}
        pokemon={[member(1, 'Pika', { pokeBall: 'great-ball' })]}
      />,
    );

    const ball = document.querySelector<SVGElement>('svg[data-poke-ball]');

    expect(ball?.style.height).toBe('115%');
    expect(ball?.style.opacity).toBe('0.85');
  });
});

describe('OverlayRenderer common style', () => {
  it('applies the common label style to every slot', () => {
    const layout = createDefaultOverlayLayout();
    layout.style.label.fontSize = 48;
    layout.style.label.color = '#ffcc00';

    render(<OverlayRenderer layout={layout} pokemon={[member(1, 'Uno'), member(2, 'Dos')]} />);

    for (const name of ['Uno', 'Dos']) {
      const { label } = parts(name);

      expect(label.style.fontSize).toBe('48px');
      expect(label.style.color).toBe('rgb(255, 204, 0)');
    }
  });

  it('derives the detail line from the common name size', () => {
    const layout = createDefaultOverlayLayout();
    layout.style.label.fontSize = 48;

    render(<OverlayRenderer layout={layout} pokemon={[member(1, 'Pika')]} />);

    expect(screen.getByText('Nv. 20').style.fontSize).toBe('32px');
  });

  it('applies the card background, border and corner radius', () => {
    const layout = createDefaultOverlayLayout();
    layout.style.card = {
      background: '#112233',
      backgroundOpacity: 0.5,
      borderWidth: 4,
      borderColor: '#ffffff',
      radius: 16,
    };

    render(<OverlayRenderer layout={layout} pokemon={[member(1, 'Pika')]} />);

    const { card } = parts('Pika');

    expect(card.style.backgroundColor).toBe('rgba(17, 34, 51, 0.5)');
    expect(card.style.border).toBe('4px solid rgb(255, 255, 255)');
    expect(card.style.borderRadius).toBe('16px');
  });

  it('can turn the text shadow off', () => {
    const layout = createDefaultOverlayLayout();
    layout.style.label.shadow = false;

    render(<OverlayRenderer layout={layout} pokemon={[member(1, 'Pika')]} />);

    expect(parts('Pika').label.style.textShadow).toBe('none');
  });

  it('uses the selected font family stack', () => {
    const layout = createDefaultOverlayLayout();
    layout.style.label.fontFamily = 'serif';

    render(<OverlayRenderer layout={layout} pokemon={[member(1, 'Pika')]} />);

    expect(normalizeFont(parts('Pika').label.style.fontFamily)).toBe(
      normalizeFont(FONT_FAMILY_STACKS.serif),
    );
  });
});

describe('OverlayRenderer per-slot style', () => {
  it('overrides only the changed slot and only the changed fields', () => {
    const layout = createDefaultOverlayLayout();
    layout.elements[0]!.style = { label: { color: '#ff0000', fontSize: 60 } };

    render(<OverlayRenderer layout={layout} pokemon={[member(1, 'Uno'), member(2, 'Dos')]} />);

    const first = parts('Uno').label;
    const second = parts('Dos').label;

    expect(first.style.color).toBe('rgb(255, 0, 0)');
    expect(first.style.fontSize).toBe('60px');
    expect(first.style.backgroundColor).toBe('rgba(0, 0, 0, 0.65)');

    expect(second.style.color).toBe('rgb(255, 255, 255)');
    expect(second.style.fontSize).toBe('36px');
  });

  it('lets one slot change the ball without touching the others', () => {
    const layout = createDefaultOverlayLayout();
    layout.elements[1]!.style = { ball: { opacity: 0.3, scale: 1.4 } };

    render(
      <OverlayRenderer
        layout={layout}
        pokemon={[
          member(1, 'Uno', { pokeBall: 'great-ball' }),
          member(2, 'Dos', { pokeBall: 'ultra-ball' }),
        ]}
      />,
    );

    const first = document.querySelector<SVGElement>('svg[data-poke-ball="great-ball"]');
    const second = document.querySelector<SVGElement>('svg[data-poke-ball="ultra-ball"]');

    expect(first?.style.opacity).toBe('0.85');
    expect(first?.style.height).toBe('115%');
    expect(second?.style.opacity).toBe('0.3');
    expect(second?.style.height).toBe('140%');
  });

  it('keeps the ball inside the card when its scale is 1 or less', () => {
    const layout = createDefaultOverlayLayout();
    layout.style.ball.scale = 0.8;

    render(
      <OverlayRenderer layout={layout} pokemon={[member(1, 'Uno', { pokeBall: 'great-ball' })]} />,
    );

    const ball = document.querySelector<SVGElement>('svg[data-poke-ball]');

    expect(ball?.style.transform).toBe('translate(-50%, 0%)');
  });
});
