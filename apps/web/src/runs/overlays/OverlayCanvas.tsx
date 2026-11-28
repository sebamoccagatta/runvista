import { useRef, useState, type PointerEvent } from 'react';

import { FONT_FAMILY_STACKS, hexToRgba, resolveElementStyle } from '@runvista/overlay-engine';
import { getPokeBall } from '@runvista/pokemon/pokeballs';
import { getPokemonSpecies } from '@runvista/pokemon/species';
import { getPokemonVariety } from '@runvista/pokemon/varieties';

import { getPokemonSpriteUrls } from '../pokemon/pokemon-sprites';
import type { RunPokemon } from '../pokemon/pokemon.api';

import type { OverlayElement, OverlayLayout } from './overlay.api';
import { PokeBallArt } from './PokeBallArt';

interface OverlayCanvasProps {
  layout: OverlayLayout;
  pokemon: RunPokemon[];
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
  onChange: (layout: OverlayLayout) => void;
}

type GestureMode = 'move' | 'resize';

interface Gesture {
  pointerId: number;
  slot: number;
  mode: GestureMode;
  startX: number;
  startY: number;
  element: OverlayElement;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function getFormName(pokemon: RunPokemon): string {
  const variety = pokemon.pokemonId != null ? getPokemonVariety(pokemon.pokemonId) : undefined;

  return (
    variety?.displayName ??
    getPokemonSpecies(pokemon.speciesId)?.displayName ??
    `Pokémon #${pokemon.speciesId}`
  );
}

function PokemonArtwork({ pokemon }: { pokemon: RunPokemon }) {
  const sources = getPokemonSpriteUrls(pokemon.speciesId, pokemon.isShiny, pokemon.pokemonId);

  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex];

  return source ? (
    <img
      src={source}
      alt=""
      draggable={false}
      decoding="async"
      className="pointer-events-none h-full w-full select-none object-contain"
      onError={() => setSourceIndex((current) => current + 1)}
    />
  ) : (
    <div className="flex h-full items-center justify-center text-3xl text-white/50">?</div>
  );
}

export function OverlayCanvas({
  layout,
  pokemon,
  selectedSlot,
  onSelectSlot,
  onChange,
}: OverlayCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const team = pokemon.filter((item) => item.status === 'TEAM' && item.teamSlot !== null);

  function beginGesture(
    event: PointerEvent<HTMLElement>,
    element: OverlayElement,
    mode: GestureMode,
  ) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    gestureRef.current = {
      pointerId: event.pointerId,
      slot: element.slot,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      element: { ...element },
    };

    onSelectSlot(element.slot);
    setActiveSlot(element.slot);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    const canvas = canvasRef.current;

    if (!gesture || !canvas || event.pointerId !== gesture.pointerId) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    const deltaX = Math.round(
      ((event.clientX - gesture.startX) * layout.canvas.width) / rect.width,
    );
    const deltaY = Math.round(
      ((event.clientY - gesture.startY) * layout.canvas.height) / rect.height,
    );

    const original = gesture.element;

    let next: OverlayElement;

    if (gesture.mode === 'move') {
      next = {
        ...original,
        x: clamp(original.x + deltaX, 0, layout.canvas.width - original.width),
        y: clamp(original.y + deltaY, 0, layout.canvas.height - original.height),
      };
    } else {
      next = {
        ...original,
        width: clamp(original.width + deltaX, 80, Math.min(600, layout.canvas.width - original.x)),
        height: clamp(
          original.height + deltaY,
          80,
          Math.min(600, layout.canvas.height - original.y),
        ),
      };
    }

    onChange({
      ...layout,
      elements: layout.elements.map((element) => (element.slot === gesture.slot ? next : element)),
    });
  }

  function endGesture(event: PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;

    if (gesture?.pointerId !== event.pointerId) {
      return;
    }

    gestureRef.current = null;
    setActiveSlot(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-secondary">
          Arrastrá los elementos para moverlos. Usá la esquina inferior derecha para cambiar su
          tamaño.
        </p>
        <span className="rounded-lg border border-white/10 px-3 py-1 text-xs text-text-secondary">
          1920 × 1080
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#080d18] p-2 sm:p-3">
        <div
          ref={canvasRef}
          aria-label="Lienzo del overlay"
          className="relative aspect-video w-full overflow-hidden rounded-lg"
          onPointerMove={handlePointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          style={{
            backgroundColor: '#111827',
            backgroundImage:
              'linear-gradient(#ffffff0a 1px, transparent 1px), linear-gradient(90deg, #ffffff0a 1px, transparent 1px)',
            backgroundSize: '5% 8.8889%',
            // Permite expresar tamaños del overlay en `cqw`: escalan con el lienzo.
            containerType: 'inline-size',
          }}
        >
          {layout.elements.map((element) => {
            const member = team.find((item) => item.teamSlot === element.slot);
            const selected = selectedSlot === element.slot;
            const active = activeSlot === element.slot;

            const formName = member ? getFormName(member) : null;
            const displayName = member?.nickname || formName;

            const style = resolveElementStyle(layout, element);
            const ball = member?.pokeBall ? getPokeBall(member.pokeBall) : undefined;
            const ballShift =
              style.ball.scale > 1 ? ((style.ball.scale - 1) / style.ball.scale) * 100 : 0;

            // Un píxel del overlay (1920 de ancho) expresado en el ancho del lienzo.
            const cq = (pixels: number) => `${(pixels / layout.canvas.width) * 100}cqw`;

            return (
              <div
                key={element.slot}
                className={`absolute overflow-visible rounded-md border transition-[border-color] ${
                  selected
                    ? 'z-20 border-accent shadow-[0_0_0_1px_#f6c453]'
                    : 'border-white/25 hover:border-white/60'
                } ${active ? 'z-30' : ''}`}
                style={{
                  left: `${(element.x / layout.canvas.width) * 100}%`,
                  top: `${(element.y / layout.canvas.height) * 100}%`,
                  width: `${(element.width / layout.canvas.width) * 100}%`,
                  height: `${(element.height / layout.canvas.height) * 100}%`,
                  touchAction: 'none',
                }}
                onPointerDown={(event) => beginGesture(event, element, 'move')}
                aria-label={`Posición ${element.slot}`}
              >
                <div
                  className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden ${
                    element.visible
                      ? style.card.backgroundOpacity === 0
                        ? 'bg-cyan-400/10'
                        : ''
                      : 'bg-white/5 opacity-45'
                  } ${style.card.radius === 0 ? 'rounded-sm' : ''}`}
                  style={{
                    ...(element.visible && style.card.backgroundOpacity > 0
                      ? {
                          backgroundColor: hexToRgba(
                            style.card.background,
                            style.card.backgroundOpacity,
                          ),
                        }
                      : {}),
                    ...(style.card.radius > 0 ? { borderRadius: cq(style.card.radius) } : {}),
                    ...(style.card.borderWidth > 0
                      ? {
                          border: `${cq(style.card.borderWidth)} solid ${style.card.borderColor}`,
                        }
                      : {}),
                  }}
                >
                  {member && element.visible ? (
                    <>
                      <div className="relative min-h-0 w-full flex-1">
                        {ball && (
                          <PokeBallArt
                            ball={ball}
                            className="pointer-events-none absolute bottom-0 aspect-square"
                            style={{
                              left: '50%',
                              height: `${style.ball.scale * 100}%`,
                              opacity: style.ball.opacity,
                              transform: `translate(-50%, ${ballShift}%)`,
                            }}
                          />
                        )}

                        <div className="relative h-full w-full">
                          <PokemonArtwork
                            key={`${member.id}-${member.pokemonId ?? 'default'}-${member.isShiny}`}
                            pokemon={member}
                          />
                        </div>
                      </div>

                      {(element.showNickname || element.showSpecies || element.showLevel) && (
                        <div
                          className="relative w-full truncate px-1 text-center leading-tight"
                          style={{
                            backgroundColor: hexToRgba(
                              style.label.background,
                              style.label.backgroundOpacity,
                            ),
                            color: style.label.color,
                            fontSize: cq(style.label.fontSize),
                            fontFamily: FONT_FAMILY_STACKS[style.label.fontFamily],
                            textShadow: style.label.shadow ? '0 1px 2px rgba(0,0,0,0.8)' : 'none',
                          }}
                        >
                          {element.showNickname && displayName && <span>{displayName} </span>}
                          {element.showSpecies && formName && <span>{formName} </span>}
                          {element.showLevel && member.level !== null && (
                            <span>Nv. {member.level}</span>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-center text-[9px] font-bold text-white/70 sm:text-xs">
                      {element.visible ? `Slot ${element.slot}` : 'Oculto'}
                    </span>
                  )}
                </div>

                <span className="pointer-events-none absolute -top-4 left-0 rounded-t bg-slate-800 px-1 text-[9px] text-white sm:-top-5 sm:text-[10px]">
                  {element.slot}
                </span>

                {selected && (
                  <button
                    type="button"
                    aria-label={`Redimensionar posición ${element.slot}`}
                    title="Arrastrar para redimensionar"
                    className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-amber-200 bg-accent shadow-lg sm:h-5 sm:w-5"
                    style={{ touchAction: 'none' }}
                    onPointerDown={(event) => {
                      beginGesture(event, element, 'resize');
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-text-secondary">
        La cuadrícula y los bordes de selección son ayudas del editor; no forman parte del diseño
        que se guardará.
      </p>
    </div>
  );
}
