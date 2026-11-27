import { useState } from 'react';

import { getPokemonSpecies } from '@runvista/pokemon/species';
import { getPokemonVariety } from '@runvista/pokemon/varieties';

import {
  FONT_FAMILY_STACKS,
  getDetailFontSize,
  hexToRgba,
  resolveElementStyle,
} from '@runvista/overlay-engine';
import { getPokeBall } from '@runvista/pokemon/pokeballs';

import { getPokemonSpriteUrls } from '../pokemon/pokemon-sprites';
import { PokeBallArt } from './PokeBallArt';

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

        const ball = member.pokeBall ? getPokeBall(member.pokeBall) : undefined;

        // Estilo común del overlay con el ajuste de este espacio encima.
        const style = resolveElementStyle(layout, element);

        // La ball queda anclada abajo y sobresale hacia la zona del texto, no hacia
        // arriba, donde la tarjeta la recortaría. Desplazamos lo que excede su alto.
        const ballShift =
          style.ball.scale > 1 ? ((style.ball.scale - 1) / style.ball.scale) * 100 : 0;

        const detailFontSize = getDetailFontSize(style.label.fontSize);

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
              backgroundColor: hexToRgba(style.card.background, style.card.backgroundOpacity),
              borderRadius: style.card.radius,
              ...(style.card.borderWidth > 0
                ? { border: `${style.card.borderWidth}px solid ${style.card.borderColor}` }
                : {}),
            }}
          >
            <div className="relative min-h-0 w-full flex-1">
              {ball && (
                // Va antes en el DOM y el sprite tiene `relative`, así que el sprite se
                // pinta encima. El tamaño y la opacidad salen del estilo del espacio.
                <PokeBallArt
                  ball={ball}
                  className="absolute bottom-0 aspect-square"
                  style={{
                    left: '50%',
                    height: `${style.ball.scale * 100}%`,
                    opacity: style.ball.opacity,
                    transform: `translate(-50%, ${ballShift}%)`,
                  }}
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
                className="relative max-w-full rounded-lg px-3 py-1.5 text-center font-bold leading-tight"
                style={{
                  backgroundColor: hexToRgba(style.label.background, style.label.backgroundOpacity),
                  color: style.label.color,
                  fontSize: style.label.fontSize,
                  fontFamily: FONT_FAMILY_STACKS[style.label.fontFamily],
                  textShadow: style.label.shadow ? '0 2px 4px rgba(0,0,0,0.8)' : 'none',
                }}
              >
                {element.showNickname && <span>{displayName}</span>}

                {element.showSpecies && (!element.showNickname || displayName !== formName) && (
                  <span
                    className="block font-medium"
                    style={{ fontSize: detailFontSize, opacity: 0.9 }}
                  >
                    {formName}
                  </span>
                )}

                {element.showLevel && member.level !== null && (
                  <span className="block" style={{ fontSize: detailFontSize, opacity: 0.9 }}>
                    Nv. {member.level}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
