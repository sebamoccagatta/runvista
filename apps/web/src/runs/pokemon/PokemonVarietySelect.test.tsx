/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { getPokemonVarieties } from '@runvista/pokemon/varieties';

import { PokemonVarietySelect } from './PokemonVarietySelect';

afterEach(() => {
  cleanup();
});

const megaX = getPokemonVarieties(6).find((variety) => variety.name === 'charizard-mega-x')!;

describe('PokemonVarietySelect', () => {
  it('does not appear without a species', () => {
    const { container } = render(
      <PokemonVarietySelect speciesId={null} value={null} onChange={vi.fn()} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('does not appear for species without alternatives', () => {
    const speciesWithoutAlternatives = 10;

    const { container } = render(
      <PokemonVarietySelect
        speciesId={speciesWithoutAlternatives}
        value={null}
        onChange={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('lists Mega Charizard X and Y', () => {
    render(<PokemonVarietySelect speciesId={6} value={null} onChange={vi.fn()} />);

    expect(
      screen.getByRole('option', {
        name: 'Charizard Mega X',
      }),
    ).toBeDefined();

    expect(
      screen.getByRole('option', {
        name: 'Charizard Mega Y',
      }),
    ).toBeDefined();
  });

  it('selects a specific variety', () => {
    const onChange = vi.fn();

    render(<PokemonVarietySelect speciesId={6} value={null} onChange={onChange} />);

    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Forma del Pokémon',
      }),
      {
        target: {
          value: String(megaX.pokemonId),
        },
      },
    );

    expect(onChange).toHaveBeenCalledWith(megaX.pokemonId);
  });

  it('allows returning to the default form', () => {
    const onChange = vi.fn();

    render(<PokemonVarietySelect speciesId={6} value={megaX.pokemonId} onChange={onChange} />);

    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Forma del Pokémon',
      }),
      {
        target: { value: '' },
      },
    );

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('disables selection when requested', () => {
    render(<PokemonVarietySelect speciesId={6} value={null} onChange={vi.fn()} disabled />);

    const select = screen.getByRole('combobox', {
      name: 'Forma del Pokémon',
    }) as HTMLSelectElement;

    expect(select.disabled).toBe(true);
  });

  it('ignores a variety from a different species', () => {
    render(<PokemonVarietySelect speciesId={26} value={megaX.pokemonId} onChange={vi.fn()} />);

    const select = screen.getByRole('combobox', {
      name: 'Forma del Pokémon',
    }) as HTMLSelectElement;

    expect(select.value).toBe('');
  });
});
