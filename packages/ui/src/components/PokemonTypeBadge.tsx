import type { ComponentPropsWithRef } from 'react';
import { POKEMON_TYPE_LABELS, type PokemonType } from '../pokemon/types';

export type PokemonTypeBadgeProps = Omit<ComponentPropsWithRef<'span'>, 'children'> & {
  type: PokemonType;
  size?: 'sm' | 'md';
};

const typeStyles: Record<PokemonType, string> = {
  normal: 'bg-[#929DA3] text-white',
  fire: 'bg-[#F08030] text-white',
  water: 'bg-[#5090D6] text-white',
  electric: 'bg-[#F4D23C] text-[#242424]',
  grass: 'bg-[#63BC5A] text-[#102410]',
  ice: 'bg-[#73CEC0] text-[#102A28]',
  fighting: 'bg-[#CE416B] text-white',
  poison: 'bg-[#AA6BC8] text-white',
  ground: 'bg-[#D97845] text-white',
  flying: 'bg-[#89AAE3] text-[#142238]',
  psychic: 'bg-[#FA7179] text-[#301015]',
  bug: 'bg-[#91C12F] text-[#182510]',
  rock: 'bg-[#C5B78C] text-[#282318]',
  ghost: 'bg-[#5269AD] text-white',
  dragon: 'bg-[#0B6DC3] text-white',
  dark: 'bg-[#5A5465] text-white',
  steel: 'bg-[#5A8EA2] text-white',
  fairy: 'bg-[#EC8FE6] text-[#30152C]',
};

const sizeStyles = {
  sm: 'min-h-6 px-2.5 text-[10px]',
  md: 'min-h-8 px-3.5 text-xs',
} as const;

export function PokemonTypeBadge({
  type,
  size = 'sm',
  className = '',
  ...props
}: PokemonTypeBadgeProps) {
  return (
    <span
      {...props}
      className={[
        'inline-flex shrink-0 items-center justify-center',
        'rounded-full font-extrabold tracking-wide uppercase',
        typeStyles[type],
        sizeStyles[size],
        className,
      ].join(' ')}
    >
      {POKEMON_TYPE_LABELS[type]}
    </span>
  );
}
