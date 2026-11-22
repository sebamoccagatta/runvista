/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { DeleteRunDialog } from './DeleteRunDialog';
import type { Run } from '../types';

const run: Run = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  ownerId: '650e8400-e29b-41d4-a716-446655440000',
  title: 'Pokémon Y',
  description: 'Randomlocke',
  status: 'ACTIVE',
  createdAt: '2026-11-21T20:00:00.000Z',
  updatedAt: '2026-11-21T20:00:00.000Z',
};

function setup(overrides: Partial<React.ComponentProps<typeof DeleteRunDialog>> = {}) {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();

  render(
    <DeleteRunDialog
      run={run}
      deleting={false}
      error={null}
      onCancel={onCancel}
      onConfirm={onConfirm}
      {...overrides}
    />,
  );

  return { onCancel, onConfirm };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DeleteRunDialog', () => {
  it('shows a confirmation with the run title', () => {
    setup();

    const dialog = screen.getByRole('alertdialog');

    expect(dialog.getAttribute('aria-modal')).toBe('true');

    expect(screen.getByText('¿Eliminar partida?')).toBeDefined();

    expect(screen.getByText('Pokémon Y')).toBeDefined();

    expect(screen.getByText(/Esta acción no se puede deshacer/)).toBeDefined();
  });

  it('focuses the cancel button when opened', () => {
    setup();

    const cancel = screen.getByRole('button', {
      name: 'Cancelar',
    });

    expect(document.activeElement).toBe(cancel);
  });

  it('cancels without deleting', () => {
    const { onCancel, onConfirm } = setup();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cancelar',
      }),
    );

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('requests deletion only after confirmation', () => {
    const { onConfirm, onCancel } = setup();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Eliminar partida',
      }),
    );

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('closes with Escape when not deleting', () => {
    const { onCancel } = setup();

    fireEvent.keyDown(document, {
      key: 'Escape',
    });

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not close with Escape during deletion', () => {
    const { onCancel } = setup({
      deleting: true,
    });

    fireEvent.keyDown(document, {
      key: 'Escape',
    });

    expect(onCancel).not.toHaveBeenCalled();
  });

  it('disables actions while deleting', () => {
    const { onConfirm } = setup({
      deleting: true,
    });

    const cancel = screen.getByRole('button', {
      name: 'Cancelar',
    });

    const confirm = screen.getByRole('button', {
      name: 'Eliminando...',
    });

    expect(cancel.hasAttribute('disabled')).toBe(true);

    expect(confirm.hasAttribute('disabled')).toBe(true);

    fireEvent.click(confirm);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows an error without closing the dialog', () => {
    setup({
      error: 'No pudimos eliminar la partida.',
    });

    expect(screen.getByRole('alert').textContent).toContain('No pudimos eliminar la partida.');

    expect(screen.getByRole('alertdialog')).toBeDefined();
  });

  it('keeps keyboard navigation inside the dialog', () => {
    setup();

    const cancel = screen.getByRole('button', {
      name: 'Cancelar',
    });

    const confirm = screen.getByRole('button', {
      name: 'Eliminar partida',
    });

    cancel.focus();

    fireEvent.keyDown(document, {
      key: 'Tab',
      shiftKey: true,
    });

    expect(document.activeElement).toBe(confirm);

    fireEvent.keyDown(document, {
      key: 'Tab',
    });

    expect(document.activeElement).toBe(cancel);
  });

  it('restores focus to the previous element on unmount', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Abrir eliminación';
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = render(
      <DeleteRunDialog
        run={run}
        deleting={false}
        error={null}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(document.activeElement).toBe(
      screen.getByRole('button', {
        name: 'Cancelar',
      }),
    );

    unmount();

    expect(document.activeElement).toBe(trigger);

    trigger.remove();
  });
});
