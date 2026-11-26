import { useState } from 'react';

import { getPokemonSpecies } from '@runvista/pokemon/species';
import { getPokemonVariety } from '@runvista/pokemon/varieties';

import { getPokeBall } from '@runvista/pokemon/pokeballs';

import { getPokemonSpriteUrls } from '../pokemon/pokemon-sprites';

import type { OverlayLayout } from './overlay.api';

export interface OverlayTeamPokemon {
  speciesId: number;
  pokemonId?: number | null;
  nickname: string | null;
  level: number | null;
  isShiny: boolean;
  // Clave de la Poké Ball. Snapshots anteriores pueden no incluirla.
  pokeBall?: string | null;
  teamSlot: number | null;
  status?: 'TEAM' | 'BOX' | 'FAINTED';
  id?: string;
}

interface OverlayRendererProps {
  layout: OverlayLayout;
  pokemon: OverlayTeamPokemon[];
}

function getFormName(pokemon: OverlayTeamPokemon): string {
  const variety = pokemon.pokemonId != null ? getPokemonVariety(pokemon.pokemonId) : undefined;

  return (
    variety?.displayName ??
    getPokemonSpecies(pokemon.speciesId)?.displayName ??
    `Pokémon #${pokemon.speciesId}`
  );
}

function OverlayPokemonImage({ pokemon }: { pokemon: OverlayTeamPokemon }) {
  const [failure, setFailure] = useState({ key: '', index: 0 });

  const sources = getPokemonSpriteUrls(pokemon.speciesId, pokemon.isShiny, pokemon.pokemonId);

  // Igual que en PokemonSprite: un fallo no se hereda a otra especie.
  const sourceKey = sources.join('|');
  const sourceIndex = failure.key === sourceKey ? failure.index : 0;

  const source = sources[sourceIndex];

  if (!source) {
    return null;
  }

  return (
    <img
      src={source}
      alt=""
      draggable={false}
      decoding="async"
      className="h-full w-full object-contain"
      onError={() => setFailure({ key: sourceKey, index: sourceIndex + 1 })}
    />
  );
}

export function OverlayRenderer({ layout, pokemon }: OverlayRendererProps) {
  const team = pokemon.filter(
    (item) => item.teamSlot !== null && (item.status === undefined || item.status === 'TEAM'),
  );

  return (
    <div
      aria-label="Overlay Pokémon"
      className="relative overflow-hidden"
      style={{
        width: layout.canvas.width,
        height: layout.canvas.height,
        background: 'transparent',
      }}
    >
      {layout.elements.map((element) => {
        if (!element.visible) {
          return null;
        }

        const member = team.find((item) => item.teamSlot === element.slot);

        if (!member) {
          return null;
        }

        const formName = getFormName(member);
        const displayName = member.nickname || formName;

        const hasText =
          element.showNickname ||
          element.showSpecies ||
          (element.showLevel && member.level !== null);

        return (
          <div
            key={element.slot}
            className="absolute flex flex-col items-center justify-center overflow-hidden"
            style={{
              left: element.x,
              top: element.y,
              width: element.width,
              height: element.height,
            }}
          >
            <div className="relative min-h-0 w-full flex-1">
              {member.pokeBall && getPokeBall(member.pokeBall) && (
                // La ball va detrás del sprite: está antes en el DOM y el sprite
                // tiene `relative`, así que se pinta encima.
                <img
                  src={getPokeBall(member.pokeBall)?.imageUrl}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-40"
                />
              )}

              <div className="relative h-full w-full">
                <OverlayPokemonImage
                  key={`${member.id ?? element.slot}-${member.pokemonId ?? 'default'}-${member.isShiny}`}
                  pokemon={member}
                />
              </div>
            </div>

            {hasText && (
              <div
                className="max-w-full rounded-lg bg-black/65 px-3 py-1.5 text-center text-4xl font-bold leading-tight text-white"
                style={{
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                }}
              >
                {element.showNickname && <span>{displayName}</span>}

                {element.showSpecies && (!element.showNickname || displayName !== formName) && (
                  <span className="block text-2xl font-medium text-white/90">{formName}</span>
                )}

                {element.showLevel && member.level !== null && (
                  <span className="block text-2xl text-white/90">Nv. {member.level}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
