/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { EditPokemonDialog } from './EditPokemonDialog';
import type { RunPokemon } from './pokemon.api';

const pokemon: RunPokemon = {
  id: '660e8400-e29b-41d4-a716-446655440000',
  runId: '550e8400-e29b-41d4-a716-446655440000',
  speciesId: 25,
  nickname: 'Pica',
  level: 25,
  isShiny: true,
  status: 'TEAM',
  teamSlot: 1,
  createdAt: '2026-11-23T12:00:00.000Z',
  updatedAt: '2026-11-23T12:00:00.000Z',
};

vi.mock('./EditPokemonForm', () => ({
  EditPokemonForm: ({ onCancel }: { onCancel: () => void }) => (
    <button type="button" onClick={onCancel}>
      Cancelar edición
    </button>
  ),
}));

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');

const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });

  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
});

afterEach(() => {
  cleanup();

  for (const [name, descriptor] of [
    ['showModal', originalShowModal],
    ['close', originalClose],
  ] as const) {
    if (descriptor) {
      Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    } else {
      Reflect.deleteProperty(HTMLDialogElement.prototype, name);
    }
  }
});

describe('EditPokemonDialog', () => {
  it('opens as a modal and shows the selected Pokemon', () => {
    render(<EditPokemonDialog pokemon={pokemon} onUpdated={vi.fn()} onClose={vi.fn()} />);

    expect(
      screen.getByRole('dialog', {
        name: 'Editar Pokémon',
      }),
    ).toBeDefined();

    expect(screen.getByText('Pica')).toBeDefined();
  });

  it('closes when clicking the close button', () => {
    const onClose = vi.fn();

    render(<EditPokemonDialog pokemon={pokemon} onUpdated={vi.fn()} onClose={onClose} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cerrar edición',
      }),
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('handles Escape through the cancel event', () => {
    const onClose = vi.fn();

    render(<EditPokemonDialog pokemon={pokemon} onUpdated={vi.fn()} onClose={onClose} />);

    const dialog = screen.getByRole('dialog', {
      name: 'Editar Pokémon',
    });

    fireEvent(
      dialog,
      new Event('cancel', {
        bubbles: false,
        cancelable: true,
      }),
    );

    expect(onClose).toHaveBeenCalledOnce();
  });
});
