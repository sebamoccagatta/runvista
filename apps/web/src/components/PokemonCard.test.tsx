import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PokemonCard, type PokemonCardData } from '@runvista/ui';

const bulbasaur: PokemonCardData = {
  id: 1,
  species: 'Bulbasaur',
  nickname: 'Verdín',
  level: 24,
  types: ['grass', 'poison'],
  hp: {
    current: 62,
    max: 68,
  },
  condition: 'active',
};

describe('PokemonCard', () => {
  it('renders the species, nickname and level', () => {
    const html = renderToStaticMarkup(<PokemonCard pokemon={bulbasaur} />);

    expect(html).toContain('Verdín');
    expect(html).toContain('Bulbasaur');
    expect(html).toContain('Lv. 24');
    expect(html).toContain('#001');
  });

  it('renders the Pokémon types', () => {
    const html = renderToStaticMarkup(<PokemonCard pokemon={bulbasaur} />);

    expect(html).toContain('Grass');
    expect(html).toContain('Poison');
  });

  it('renders HP information', () => {
    const html = renderToStaticMarkup(<PokemonCard pokemon={bulbasaur} />);

    expect(html).toContain('62 / 68');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="91"');
  });

  it('supports Pokémon without HP information', () => {
    const html = renderToStaticMarkup(
      <PokemonCard
        pokemon={
          {
            ...bulbasaur,
            hp: undefined,
          } as PokemonCardData
        }
      />,
    );

    expect(html).not.toContain('role="progressbar"');
  });

  it('renders a placeholder without an image', () => {
    const html = renderToStaticMarkup(<PokemonCard pokemon={bulbasaur} />);

    expect(html).toContain('>?</span>');
  });

  it('renders the deceased state', () => {
    const html = renderToStaticMarkup(
      <PokemonCard
        pokemon={{
          ...bulbasaur,
          condition: 'deceased',
          imageUrl: '/pokemon/bulbasaur.png',
        }}
      />,
    );

    expect(html).toContain('Deceased');
    expect(html).toContain('grayscale');
  });

  it('renders the fainted state', () => {
    const html = renderToStaticMarkup(
      <PokemonCard
        pokemon={{
          ...bulbasaur,
          condition: 'fainted',
          hp: {
            current: 0,
            max: 68,
          },
        }}
      />,
    );

    expect(html).toContain('Fainted');
    expect(html).toContain('0 / 68');
    expect(html).toContain('aria-valuenow="0"');
  });
});
