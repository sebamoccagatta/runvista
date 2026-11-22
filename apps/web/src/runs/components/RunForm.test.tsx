/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { RunForm } from './RunForm';
import type { Run } from '../types';

const existingRun: Run = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  ownerId: '650e8400-e29b-41d4-a716-446655440000',
  title: 'Pokémon Y',
  description: 'Randomlocke',
  status: 'DRAFT',
  createdAt: '2026-11-21T20:00:00.000Z',
  updatedAt: '2026-11-21T20:00:00.000Z',
};

const defaultProps = {
  saving: false,
  error: null,
  onCancel: vi.fn(),
  onSubmit: vi.fn(async () => {}),
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RunForm', () => {
  it('renders the creation form without status selection', () => {
    render(<RunForm {...defaultProps} />);

    expect(screen.getByText('Nueva partida')).toBeDefined();

    expect(
      screen.getByRole('button', {
        name: 'Crear partida',
      }),
    ).toBeDefined();

    expect(screen.queryByLabelText('Estado de la partida')).toBeNull();
  });

  it('submits normalized creation values', async () => {
    render(<RunForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Nombre de la partida'), {
      target: {
        value: '  Pokémon Y  ',
      },
    });

    fireEvent.change(screen.getByLabelText(/Descripción/), {
      target: {
        value: '  Randomlocke  ',
      },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Crear partida',
      }),
    );

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith({
        title: 'Pokémon Y',
        description: 'Randomlocke',
        status: 'DRAFT',
      });
    });
  });

  it('normalizes an empty description to null', async () => {
    render(<RunForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Nombre de la partida'), {
      target: { value: 'Pokémon Esmeralda' },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Crear partida',
      }),
    );

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
        }),
      );
    });
  });

  it('preloads existing run values for editing', () => {
    render(<RunForm {...defaultProps} run={existingRun} />);

    expect(screen.getByLabelText('Nombre de la partida')).toHaveProperty('value', 'Pokémon Y');

    expect(screen.getByLabelText(/Descripción/)).toHaveProperty('value', 'Randomlocke');

    expect(screen.getByLabelText('Estado de la partida')).toHaveProperty('value', 'DRAFT');
  });

  it('submits an updated run status', async () => {
    render(<RunForm {...defaultProps} run={existingRun} />);

    fireEvent.change(screen.getByLabelText('Estado de la partida'), {
      target: { value: 'ACTIVE' },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Guardar cambios',
      }),
    );

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ACTIVE',
        }),
      );
    });
  });

  it('disables editing while saving', () => {
    render(<RunForm {...defaultProps} run={existingRun} saving />);

    expect(
      screen.getByRole('button', {
        name: 'Guardando...',
      }),
    ).toHaveProperty('disabled', true);

    expect(screen.getByLabelText('Nombre de la partida')).toHaveProperty('disabled', true);

    expect(
      screen.getByRole('button', {
        name: 'Cancelar',
      }),
    ).toHaveProperty('disabled', true);
  });

  it('preserves form values when the server reports an error', () => {
    render(<RunForm {...defaultProps} run={existingRun} error="No pudimos guardar los cambios." />);

    expect(screen.getByRole('alert').textContent).toContain('No pudimos guardar los cambios.');

    expect(screen.getByLabelText('Nombre de la partida')).toHaveProperty('value', 'Pokémon Y');
  });

  it('calls onCancel without submitting', () => {
    render(<RunForm {...defaultProps} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cancelar',
      }),
    );

    expect(defaultProps.onCancel).toHaveBeenCalledOnce();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });
});
