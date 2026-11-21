import type { ReactNode } from 'react';
import type { PokemonCardData } from './PokemonCard';

export type PartySlotProps = {
  slot: number;
  pokemon?: PokemonCardData | null | undefined;
  selected?: boolean;
  onSelect?: (() => void) | undefined;
  className?: string;
};

const conditionLabels = {
  active: 'Activo',
  fainted: 'Debilitado',
  deceased: 'Fallecido',
} as const;

function SlotContent({ pokemon }: Pick<PartySlotProps, 'pokemon'>) {
  if (!pokemon) {
    return (
      <div className="flex min-h-36 flex-col items-center justify-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-white/20 bg-white/5 text-2xl text-text-secondary"
        >
          +
        </span>

        <span className="text-xs font-medium text-text-secondary">Ranura vacía</span>
      </div>
    );
  }

  const condition = pokemon.condition ?? 'active';
  const inactive = condition !== 'active';
  const displayName = pokemon.nickname || pokemon.species;

  return (
    <div className="flex min-h-36 flex-col items-center">
      <div className="relative flex h-24 w-full items-center justify-center">
        <div
          aria-hidden="true"
          className="absolute h-20 w-20 rounded-full border border-white/10 bg-white/5"
        />

        {pokemon.imageUrl ? (
          <img
            src={pokemon.imageUrl}
            alt=""
            loading="lazy"
            className={[
              'relative h-24 w-24 object-contain',
              condition === 'deceased' ? 'grayscale opacity-50' : '',
              condition === 'fainted' ? 'opacity-70' : '',
            ].join(' ')}
          />
        ) : (
          <span aria-hidden="true" className="relative text-4xl font-black text-white/20">
            ?
          </span>
        )}
      </div>

      <span className="mt-2 w-full truncate text-center text-sm font-bold">{displayName}</span>

      <span className="mt-1 text-xs text-text-secondary">Lv. {pokemon.level}</span>

      {inactive && (
        <span
          className={[
            'mt-2 rounded-full px-2 py-1 text-[10px] font-bold',
            condition === 'deceased' ? 'bg-brand/15 text-brand' : 'bg-accent/15 text-accent',
          ].join(' ')}
        >
          {conditionLabels[condition]}
        </span>
      )}
    </div>
  );
}

export function PartySlot({
  slot,
  pokemon,
  selected = false,
  onSelect,
  className = '',
}: PartySlotProps) {
  const baseClasses = [
    'relative block h-full w-full min-w-0 rounded-card border p-3 text-left',
    'transition-colors duration-200',
    selected
      ? 'border-accent bg-surface-raised'
      : 'border-white/10 bg-surface hover:border-white/25',
    className,
  ].join(' ');

  const accessibleLabel = pokemon
    ? `Ranura ${slot}: ${pokemon.nickname || pokemon.species}, nivel ${pokemon.level}, ${conditionLabels[pokemon.condition ?? 'active']}`
    : `Ranura ${slot}: vacía`;

  const content: ReactNode = (
    <>
      <span
        aria-hidden="true"
        className="absolute top-3 left-3 text-[10px] font-bold tracking-widest text-text-secondary"
      >
        {String(slot).padStart(2, '0')}
      </span>

      <SlotContent pokemon={pokemon} />
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={accessibleLabel}
        aria-pressed={selected}
        className={[
          baseClasses,
          'cursor-pointer focus-visible:outline-2',
          'focus-visible:outline-offset-2 focus-visible:outline-accent',
        ].join(' ')}
      >
        {content}
      </button>
    );
  }

  return (
    <div role="group" aria-label={accessibleLabel} className={baseClasses}>
      {content}
    </div>
  );
}
