/**
 * @vitest-environment jsdom
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultOverlayLayout, type OverlayLayout } from './overlay.api';
import { OverlayRenderer, type OverlayTeamPokemon } from './OverlayRenderer';

const animationsCss = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'overlay-animations.css'),
  'utf8',
);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

function member(slot: number, overrides: Partial<OverlayTeamPokemon> = {}): OverlayTeamPokemon {
  return {
    id: `pokemon-${slot}`,
    speciesId: 25,
    pokemonId: null,
    nickname: `Pika${slot}`,
    level: 20,
    isShiny: false,
    pokeBall: null,
    teamSlot: slot,
    status: 'TEAM',
    ...overrides,
  };
}

function layout(enabled = true): OverlayLayout {
  const value = createDefaultOverlayLayout();
  value.animations = { enabled };

  return value;
}

function motionClasses(): string[] {
  return Array.from(document.querySelectorAll('[class]'), (element) => element.className).filter(
    (className) => className.includes('runvista-'),
  );
}

describe('OverlayRenderer team motion', () => {
  it('does not animate the team it loads with', () => {
    render(<OverlayRenderer layout={layout()} pokemon={[member(1, { pokeBall: 'great-ball' })]} />);

    expect(screen.getByText('Pika1')).toBeTruthy();
    expect(document.querySelector('.runvista-capture-ball')).toBeNull();
    expect(document.querySelector('.runvista-capture-pokemon')).toBeNull();
    expect(document.querySelector('.runvista-enter')).toBeNull();
  });

  it('plays the capture when a Pokémon arrives in an empty slot', () => {
    const current = layout();
    const { rerender } = render(<OverlayRenderer layout={current} pokemon={[]} />);

    rerender(
      <OverlayRenderer layout={current} pokemon={[member(1, { pokeBall: 'great-ball' })]} />,
    );

    expect(document.querySelector('.runvista-capture-ball')).not.toBeNull();
    expect(document.querySelector('.runvista-capture-pokemon')).not.toBeNull();
  });

  it('plays only the entrance when a Pokémon replaces another in the slot', () => {
    const current = layout();
    const { rerender } = render(<OverlayRenderer layout={current} pokemon={[member(1)]} />);

    rerender(
      <OverlayRenderer
        layout={current}
        pokemon={[member(1, { speciesId: 4, nickname: 'Charmander' })]}
      />,
    );

    expect(screen.getByText('Charmander')).toBeTruthy();
    expect(document.querySelector('.runvista-enter')).not.toBeNull();
    expect(document.querySelector('.runvista-capture-pokemon')).toBeNull();
  });

  it('keeps a Pokémon that leaves visible until its fade ends', () => {
    const current = layout();
    const { rerender } = render(<OverlayRenderer layout={current} pokemon={[member(1)]} />);

    rerender(<OverlayRenderer layout={current} pokemon={[]} />);

    expect(screen.getByText('Pika1')).toBeTruthy();
    expect(document.querySelector('.runvista-leave')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByText('Pika1')).toBeNull();
  });

  it('does not animate a team whose visible data did not change', () => {
    const current = layout();
    const { rerender } = render(<OverlayRenderer layout={current} pokemon={[member(1)]} />);

    // Mismo Pokémon con otra fila interna: no se ve distinto, no se anima.
    rerender(<OverlayRenderer layout={current} pokemon={[member(1, { id: 'other-row' })]} />);

    expect(motionClasses().filter((name) => !name.includes('runvista-idle'))).toEqual([]);
  });

  it('keeps the team still and idle motion off when animations are disabled', () => {
    const current = layout(false);
    const { rerender } = render(<OverlayRenderer layout={current} pokemon={[]} />);

    rerender(<OverlayRenderer layout={current} pokemon={[member(1)]} />);

    expect(motionClasses()).toEqual([]);

    rerender(<OverlayRenderer layout={current} pokemon={[]} />);

    expect(screen.queryByText('Pika1')).toBeNull();
  });

  it('moves Pokémon idly while animations are enabled', () => {
    render(<OverlayRenderer layout={layout()} pokemon={[member(1)]} />);

    expect(document.querySelector('.runvista-idle')).not.toBeNull();
  });
});

// Las animaciones de captura conservan su último fotograma (`fill-mode: both`).
// Si ese fotograma oculta algo, la ball o el Pokémon desaparece hasta recargar la fuente.
describe('capture animations end with the team visible', () => {
  function finalFrame(name: string): string {
    const block = animationsCss.split(`@keyframes ${name}`)[1]?.split('\n}')[0] ?? '';
    const frames = [...block.matchAll(/(?:100%|to)\s*\{([^}]*)\}/g)];

    return frames.at(-1)?.[1] ?? '';
  }

  it.each(['runvista-capture-ball', 'runvista-capture-pokemon', 'runvista-enter'])(
    '%s does not end hidden',
    (name) => {
      const frame = finalFrame(name);

      expect(frame).toContain('opacity: 1');
    },
  );
});
