import type { PokemonType } from '../pokemon/types';
import { PokemonTypeBadge } from './PokemonTypeBadge';
import { Badge } from './Badge';
import { Card } from './Card';

export type PokemonCondition = 'active' | 'fainted' | 'deceased';

export type PokemonCardData = {
  id: number;
  species: string;
  nickname?: string;
  level: number;
  types: readonly PokemonType[];
  imageUrl?: string;
  hp?: {
    current: number;
    max: number;
  };
  condition?: PokemonCondition;
};

export type PokemonCardProps = {
  pokemon: PokemonCardData;
  className?: string;
};

const conditionLabels: Record<PokemonCondition, string> = {
  active: 'Active',
  fainted: 'Fainted',
  deceased: 'Deceased',
};

const conditionTones = {
  active: 'success',
  fainted: 'accent',
  deceased: 'brand',
} as const;

function getHpPercentage(current: number, max: number) {
  if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (current / max) * 100));
}

export function PokemonCard({ pokemon, className = '' }: PokemonCardProps) {
  const condition = pokemon.condition ?? 'active';
  const isDeceased = condition === 'deceased';
  const hasNickname = Boolean(pokemon.nickname) && pokemon.nickname !== pokemon.species;

  const hpPercentage = pokemon.hp ? getHpPercentage(pokemon.hp.current, pokemon.hp.max) : null;

  const hpColor =
    hpPercentage === null
      ? ''
      : hpPercentage <= 20
        ? 'bg-brand'
        : hpPercentage <= 50
          ? 'bg-accent'
          : 'bg-success';

  return (
    <article className={className}>
      <Card className="h-full overflow-hidden p-0">
        <div className="relative flex min-h-44 items-center justify-center overflow-hidden border-b border-white/10 bg-surface-raised">
          <div
            aria-hidden="true"
            className="absolute h-36 w-36 rounded-full border border-white/10 bg-white/5"
          />

          {pokemon.imageUrl ? (
            <img
              src={pokemon.imageUrl}
              alt={pokemon.species}
              loading="lazy"
              className={[
                'relative z-10 h-40 w-40 object-contain',
                isDeceased ? 'grayscale opacity-50' : '',
              ].join(' ')}
            />
          ) : (
            <span aria-hidden="true" className="relative z-10 text-6xl font-black text-white/15">
              ?
            </span>
          )}

          <div className="absolute top-4 right-4 z-20">
            <Badge tone={conditionTones[condition]}>{conditionLabels[condition]}</Badge>
          </div>

          <span className="absolute bottom-4 left-4 text-xs font-bold tracking-widest text-text-secondary">
            #{String(pokemon.id).padStart(3, '0')}
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-black">{pokemon.nickname || pokemon.species}</h3>

              {hasNickname && <p className="mt-1 text-sm text-text-secondary">{pokemon.species}</p>}
            </div>

            <span className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold">
              Lv. {pokemon.level}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {pokemon.types.map((type) => (
              <PokemonTypeBadge key={type} type={type} />
            ))}
          </div>

          {pokemon.hp && hpPercentage !== null && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                <span className="font-bold tracking-wider text-text-secondary">HP</span>

                <span className="font-semibold tabular-nums">
                  {pokemon.hp.current} / {pokemon.hp.max}
                </span>
              </div>

              <div
                role="progressbar"
                aria-label="HP"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(hpPercentage)}
                className="h-2 overflow-hidden rounded-full bg-black/30"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${hpColor}`}
                  style={{ width: `${hpPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </article>
  );
}
