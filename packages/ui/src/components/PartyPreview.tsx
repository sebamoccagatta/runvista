import type { PokemonCardData } from './PokemonCard';
import { PartySlot } from './PartySlot';

export type PartyPreviewProps = {
  pokemon: readonly (PokemonCardData | null)[];
  selectedSlot?: number | null;
  onSlotSelect?: (slot: number) => void;
  className?: string;
};

const PARTY_SIZE = 6;

export function PartyPreview({
  pokemon,
  selectedSlot = null,
  onSlotSelect,
  className = '',
}: PartyPreviewProps) {
  const slots = Array.from({ length: PARTY_SIZE }, (_, index) => pokemon[index] ?? null);

  return (
    <div
      aria-label="Equipo Pokémon"
      className={['grid grid-cols-2 gap-3', 'sm:grid-cols-3 xl:grid-cols-6', className].join(' ')}
    >
      {slots.map((entry, index) => {
        const slot = index + 1;

        return (
          <PartySlot
            key={slot}
            slot={slot}
            pokemon={entry}
            selected={selectedSlot === slot}
            {...(onSlotSelect ? { onSelect: () => onSlotSelect(slot) } : {})}
          />
        );
      })}
    </div>
  );
}
