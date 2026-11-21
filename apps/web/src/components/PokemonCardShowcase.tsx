import { Badge, Card, PokemonCard, type PokemonCardData } from '@runvista/ui';

const pokemon: PokemonCardData[] = [
  {
    id: 1,
    species: 'Bulbasaur',
    nickname: 'Verdín',
    level: 24,
    types: ['grass', 'poison'],
    imageUrl:
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
    hp: {
      current: 62,
      max: 68,
    },
    condition: 'active',
  },
  {
    id: 6,
    species: 'Charizard',
    nickname: 'Ignis',
    level: 42,
    types: ['fire', 'flying'],
    imageUrl:
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
    hp: {
      current: 0,
      max: 135,
    },
    condition: 'fainted',
  },
  {
    id: 94,
    species: 'Gengar',
    level: 38,
    types: ['ghost', 'poison'],
    imageUrl:
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png',
    hp: {
      current: 0,
      max: 105,
    },
    condition: 'deceased',
  },
  {
    id: 25,
    species: 'Pikachu',
    nickname: 'Chispa',
    level: 18,
    types: ['electric'],
    hp: {
      current: 41,
      max: 41,
    },
    condition: 'active',
  },
];

export function PokemonCardShowcase() {
  return (
    <section className="mt-8">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              Pokémon / Cards
            </p>

            <h2 className="mt-2 text-2xl font-bold">Pokémon collection</h2>

            <p className="mt-2 text-sm text-text-secondary">
              Card states, nicknames, types and HP indicators.
            </p>
          </div>

          <Badge tone="accent">Component preview</Badge>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {pokemon.map((entry) => (
            <PokemonCard key={entry.id} pokemon={entry} />
          ))}
        </div>
      </Card>
    </section>
  );
}
