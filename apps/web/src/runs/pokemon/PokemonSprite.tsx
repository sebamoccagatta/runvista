import { useState } from 'react';

import { getPokemonSpecies } from '@runvista/pokemon/species';
import { getPokemonVariety, isPokemonVarietyForSpecies } from '@runvista/pokemon/varieties';

import { getPokemonSpriteUrls } from './pokemon-sprites';

interface PokemonSpriteProps {
  speciesId: number;
  pokemonId?: number | null;
  isShiny?: boolean;
  size?: 'sm' | 'md' | 'lg';
  loading?: 'eager' | 'lazy';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-36 w-36',
} as const;

interface SpriteImageProps {
  speciesId: number;
  pokemonId: number | null;
  isShiny: boolean;
  size: 'sm' | 'md' | 'lg';
  loading: 'eager' | 'lazy';
  className: string;
}

function SpriteImage({
  speciesId,
  pokemonId,
  isShiny,
  size,
  loading,
  className,
}: SpriteImageProps) {
  const [failure, setFailure] = useState({ key: '', index: 0 });

  const species = getPokemonSpecies(speciesId);

  const variety =
    pokemonId !== null && isPokemonVarietyForSpecies(speciesId, pokemonId)
      ? getPokemonVariety(pokemonId)
      : undefined;

  const sources = getPokemonSpriteUrls(speciesId, isShiny, pokemonId);

  // Un fallo solo vale para la lista de URLs que lo produjo.
  // Si cambia la especie, volvemos a la primera fuente.
  const sourceKey = sources.join('|');
  const sourceIndex = failure.key === sourceKey ? failure.index : 0;

  const displayName = variety?.displayName ?? species?.displayName ?? `Pokémon #${speciesId}`;

  const imageLabel = isShiny ? `${displayName} shiny` : displayName;

  const source = sources[sourceIndex];

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden ${SIZE_CLASSES[size]} ${className}`}
    >
      {source ? (
        <img
          src={source}
          alt={imageLabel}
          loading={loading}
          decoding="async"
          draggable={false}
          className="h-full w-full object-contain"
          onError={() => {
            setFailure({ key: sourceKey, index: sourceIndex + 1 });
          }}
        />
      ) : (
        <div
          role="img"
          aria-label={`Imagen no disponible: ${imageLabel}`}
          className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/15 bg-white/5 text-text-secondary"
        >
          <span aria-hidden="true" className="text-xl font-bold">
            ?
          </span>

          <span className="text-[10px] font-semibold">#{String(speciesId).padStart(4, '0')}</span>
        </div>
      )}
    </div>
  );
}

export function PokemonSprite({
  speciesId,
  pokemonId = null,
  isShiny = false,
  size = 'md',
  loading = 'lazy',
  className = '',
}: PokemonSpriteProps) {
  return (
    <SpriteImage
      key={`${speciesId}-${pokemonId ?? 'default'}-${isShiny}`}
      speciesId={speciesId}
      pokemonId={pokemonId}
      isShiny={isShiny}
      size={size}
      loading={loading}
      className={className}
    />
  );
}
