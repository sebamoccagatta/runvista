import { useEffect, useRef, useState } from 'react';

import { getPokemonSpecies } from '@runvista/pokemon/species';
import { getPokemonVariety } from '@runvista/pokemon/varieties';

import {
  FONT_FAMILY_STACKS,
  diffTeamSnapshots,
  getDetailFontSize,
  getTeamMemberFingerprint,
  getTeamSlotMembers,
  hexToRgba,
  resolveElementStyle,
} from '@runvista/overlay-engine';
import { getPokeBall } from '@runvista/pokemon/pokeballs';

import { getPokemonSpriteUrls } from '../pokemon/pokemon-sprites';
import { PokeBallArt } from './PokeBallArt';

import type { OverlayLayout } from './overlay.api';
import './overlay-animations.css';

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

// Duración de la salida de un Pokémon del equipo; el espacio se vacía después.
const LEAVE_DURATION_MS = 400;

interface SlotMotion {
  kind: 'captured' | 'replaced';
  // Cambia en cada animación: fuerza a React a reiniciar la clase CSS.
  token: number;
}

interface TeamMotion {
  slots: ReadonlyMap<number, SlotMotion>;
  // Miembros que salieron y se siguen dibujando mientras se desvanecen.
  departing: ReadonlyMap<number, OverlayTeamPokemon>;
}

interface TeamSnapshot {
  fingerprints: ReadonlyMap<number, string>;
  members: ReadonlyMap<number, OverlayTeamPokemon>;
}

const NO_MOTION: TeamMotion = { slots: new Map(), departing: new Map() };

/**
 * Compara cada snapshot con el anterior y devuelve qué espacios animar.
 * El primer snapshot no anima: es la carga inicial del overlay.
 */
function useTeamMotion(pokemon: OverlayTeamPokemon[], enabled: boolean): TeamMotion {
  const [motion, setMotion] = useState<TeamMotion>(NO_MOTION);
  const snapshotRef = useRef<TeamSnapshot | null>(null);
  const tokenRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const members = getTeamSlotMembers(pokemon);
    const fingerprints = new Map(
      [...members].map(([slot, item]) => [slot, getTeamMemberFingerprint(item)]),
    );

    const previous = snapshotRef.current;
    snapshotRef.current = { fingerprints, members };

    if (!previous || !enabled) {
      return;
    }

    const changes = diffTeamSnapshots(previous.fingerprints, fingerprints);

    if (
      changes.captured.length === 0 &&
      changes.replaced.length === 0 &&
      changes.removed.length === 0
    ) {
      return;
    }

    tokenRef.current += 1;
    const token = tokenRef.current;

    setMotion((current) => {
      const slots = new Map(current.slots);
      const departing = new Map(current.departing);

      for (const slot of changes.captured) {
        slots.set(slot, { kind: 'captured', token });
        departing.delete(slot);
      }

      for (const slot of changes.replaced) {
        slots.set(slot, { kind: 'replaced', token });
        departing.delete(slot);
      }

      for (const slot of changes.removed) {
        const gone = previous.members.get(slot);

        slots.delete(slot);

        if (gone) {
          departing.set(slot, gone);
        }
      }

      return { slots, departing };
    });

    for (const slot of changes.removed) {
      const timer = window.setTimeout(() => {
        setMotion((current) => {
          if (!current.departing.has(slot)) {
            return current;
          }

          const departing = new Map(current.departing);
          departing.delete(slot);

          return { slots: current.slots, departing };
        });
      }, LEAVE_DURATION_MS);

      timersRef.current.push(timer);
    }
  }, [pokemon, enabled]);

  useEffect(() => {
    const timers = timersRef.current;

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  return motion;
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
  const animated = layout.animations.enabled;
  const motion = useTeamMotion(pokemon, animated);
  const team = getTeamSlotMembers(pokemon);

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

        const current = team.get(element.slot);
        const leaving = current === undefined;
        const member = current ?? motion.departing.get(element.slot);

        if (!member) {
          return null;
        }

        const slotMotion = leaving ? undefined : motion.slots.get(element.slot);
        const captured = slotMotion?.kind === 'captured';
        const replaced = slotMotion?.kind === 'replaced';
        const motionKey = slotMotion ? String(slotMotion.token) : 'still';

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
            className={`absolute flex flex-col items-center justify-center overflow-hidden ${
              leaving ? 'runvista-leave' : ''
            }`}
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
                // La animación de captura va en el contenedor para no pisar el `transform`
                // que centra la ball.
                <div
                  key={`ball-${motionKey}`}
                  className={`absolute inset-0 ${captured ? 'runvista-capture-ball' : ''}`}
                >
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
                </div>
              )}

              <div
                key={`sprite-${motionKey}`}
                className={`relative h-full w-full ${
                  captured ? 'runvista-capture-pokemon' : replaced ? 'runvista-enter' : ''
                }`}
              >
                <div
                  className={animated && !leaving ? 'runvista-idle h-full w-full' : 'h-full w-full'}
                >
                  <OverlayPokemonImage
                    key={`${member.id ?? element.slot}-${member.pokemonId ?? 'default'}-${member.isShiny}`}
                    pokemon={member}
                  />
                </div>
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
