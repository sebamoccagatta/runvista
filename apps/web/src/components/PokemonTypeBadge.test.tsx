import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { POKEMON_TYPES, POKEMON_TYPE_LABELS, PokemonTypeBadge } from '@runvista/ui';

describe('PokemonTypeBadge', () => {
  it('defines exactly 18 Pokémon types', () => {
    expect(POKEMON_TYPES).toHaveLength(18);
    expect(new Set(POKEMON_TYPES).size).toBe(18);
  });

  it.each(POKEMON_TYPES)('renders the %s type', (type) => {
    const html = renderToStaticMarkup(<PokemonTypeBadge type={type} />);

    expect(html).toContain(POKEMON_TYPE_LABELS[type]);
    expect(html).toContain('rounded-full');
  });

  it('renders the requested size', () => {
    const small = renderToStaticMarkup(<PokemonTypeBadge type="fire" size="sm" />);

    const medium = renderToStaticMarkup(<PokemonTypeBadge type="fire" size="md" />);

    expect(small).toContain('min-h-6');
    expect(medium).toContain('min-h-8');
  });

  it('preserves custom CSS classes', () => {
    const html = renderToStaticMarkup(<PokemonTypeBadge type="water" className="custom-type" />);

    expect(html).toContain('custom-type');
  });
});
