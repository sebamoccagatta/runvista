/**
 * @vitest-environment jsdom
 */

import { useState } from 'react';

import { afterEach, describe, expect, it } from 'vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { PokemonSpeciesSelect } from './PokemonSpeciesSelect';

function TestSelector({ initialValue = null }: { initialValue?: number | null }) {
  const [value, setValue] = useState<number | null>(initialValue);

  return (
    <div>
      <PokemonSpeciesSelect value={value} onChange={setValue} />

      <output data-testid="selected-species">{value ?? 'none'}</output>
    </div>
  );
}

afterEach(() => {
  cleanup();
});

describe('PokemonSpeciesSelect', () => {
  it('renders the search field', () => {
    render(<TestSelector />);

    expect(
      screen.getByRole('combobox', {
        name: 'Especie Pokémon',
      }),
    ).toBeDefined();
  });

  it('searches Pokemon by name', () => {
    render(<TestSelector />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Greninja' },
    });

    expect(
      screen.getByRole('option', {
        name: /Greninja/,
      }),
    ).toBeDefined();
  });

  it('searches Pokemon by National Pokedex number', () => {
    render(<TestSelector />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: '658' },
    });

    expect(
      screen.getByRole('option', {
        name: /Greninja/,
      }),
    ).toBeDefined();
  });

  it('selects a Pokemon from the results', () => {
    render(<TestSelector />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Pikachu' },
    });

    fireEvent.click(
      screen.getByRole('option', {
        name: /Pikachu/,
      }),
    );

    expect(screen.getByTestId('selected-species').textContent).toBe('25');

    expect(screen.getByText('Seleccionado')).toBeDefined();
  });

  it('supports keyboard selection', () => {
    render(<TestSelector />);

    const input = screen.getByRole('combobox');

    fireEvent.change(input, {
      target: { value: 'Greninja' },
    });

    fireEvent.keyDown(input, {
      key: 'Enter',
    });

    expect(screen.getByTestId('selected-species').textContent).toBe('658');
  });

  it('supports moving through results with arrows', () => {
    render(<TestSelector />);

    const input = screen.getByRole('combobox');

    fireEvent.change(input, {
      target: { value: 'char' },
    });

    fireEvent.keyDown(input, {
      key: 'ArrowDown',
    });

    const selectedOption = screen
      .getAllByRole('option')
      .find((option) => option.getAttribute('aria-selected') === 'true');

    expect(selectedOption).toBeDefined();
  });

  it('shows an empty results message', () => {
    render(<TestSelector />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: {
        value: 'pokemon-inexistente-123',
      },
    });

    expect(screen.getByText('No encontramos Pokémon con ese nombre o número.')).toBeDefined();
  });

  it('clears the selected Pokemon', () => {
    render(<TestSelector initialValue={25} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Limpiar especie',
      }),
    );

    expect(screen.getByTestId('selected-species').textContent).toBe('none');

    expect(screen.getByRole('combobox')).toHaveProperty('value', '');
  });

  it('loads a previously selected species', () => {
    render(<TestSelector initialValue={658} />);

    expect(screen.getByRole('combobox')).toHaveProperty('value', 'Greninja');

    expect(screen.getByText('Seleccionado')).toBeDefined();
  });

  it('closes results with Escape', () => {
    render(<TestSelector />);

    const input = screen.getByRole('combobox');

    fireEvent.change(input, {
      target: { value: 'Pikachu' },
    });

    fireEvent.keyDown(input, {
      key: 'Escape',
    });

    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
