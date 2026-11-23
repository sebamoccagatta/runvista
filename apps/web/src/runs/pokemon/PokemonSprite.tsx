import { useState } from 'react';

import { getPokemonSpecies } from '@runvista/pokemon/species';

import { getPokemonSpriteUrls } from './pokemon-sprites';

interface PokemonSpriteProps {
  speciesId: number;
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
  isShiny: boolean;
  size: 'sm' | 'md' | 'lg';
  loading: 'eager' | 'lazy';
  className: string;
}

function SpriteImage({ speciesId, isShiny, size, loading, className }: SpriteImageProps) {
  const [sourceIndex, setSourceIndex] = useState(0);

  const species = getPokemonSpecies(speciesId);
  const sources = getPokemonSpriteUrls(speciesId, isShiny);

  const source = sources[sourceIndex];

  const displayName = species?.displayName ?? `Pokémon #${speciesId}`;

  const imageLabel = isShiny ? `${displayName} shiny` : displayName;

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
            setSourceIndex((current) => current + 1);
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

          <span aria-hidden="true" className="text-[10px] font-semibold">
            #{String(speciesId).padStart(4, '0')}
          </span>
        </div>
      )}
    </div>
  );
}

export function PokemonSprite({
  speciesId,
  isShiny = false,
  size = 'md',
  loading = 'lazy',
  className = '',
}: PokemonSpriteProps) {
  return (
    <SpriteImage
      key={`${speciesId}-${isShiny}`}
      speciesId={speciesId}
      isShiny={isShiny}
      size={size}
      loading={loading}
      className={className}
    />
  );
}
