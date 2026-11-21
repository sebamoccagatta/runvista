import { useState } from 'react';
import { Badge, Card, PartyPreview, type PokemonCardData } from '@runvista/ui';

const demoParty: (PokemonCardData | null)[] = [
  {
    id: 1,
    species: 'Bulbasaur',
    nickname: 'Verdín',
    level: 24,
    types: ['grass', 'poison'],
    imageUrl:
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
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
    condition: 'fainted',
  },
  {
    id: 25,
    species: 'Pikachu',
    nickname: 'Chispa',
    level: 18,
    types: ['electric'],
    imageUrl:
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    condition: 'active',
  },
  null,
  null,
  null,
];

export function PartyPreviewShowcase() {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const occupiedSlots = demoParty.filter((entry) => entry !== null).length;

  const selectedPokemon = selectedSlot === null ? null : demoParty[selectedSlot - 1];

  return (
    <section className="mt-8">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              Pokémon / Party
            </p>

            <h2 className="mt-2 text-2xl font-bold">Current party</h2>

            <p className="mt-2 text-sm text-text-secondary">
              Six slots with selection and condition states.
            </p>
          </div>

          <Badge tone="accent">{occupiedSlots} / 6 Pokémon</Badge>
        </div>

        <div className="mt-6">
          <PartyPreview
            pokemon={demoParty}
            selectedSlot={selectedSlot}
            onSlotSelect={setSelectedSlot}
          />
        </div>

        <div
          aria-live="polite"
          className="mt-6 rounded-xl border border-white/10 bg-surface-raised p-4"
        >
          <p className="text-xs font-bold tracking-widest text-text-secondary uppercase">
            Selected slot
          </p>

          <p className="mt-2 font-semibold">
            {selectedSlot === null
              ? 'Select a party slot'
              : selectedPokemon
                ? `Slot ${selectedSlot}: ${selectedPokemon.nickname || selectedPokemon.species}`
                : `Slot ${selectedSlot}: Empty`}
          </p>
        </div>
      </Card>
    </section>
  );
}
