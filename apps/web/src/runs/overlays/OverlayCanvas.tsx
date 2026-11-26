import { useRef, useState, type PointerEvent } from 'react';

import { getPokemonSpecies } from '@runvista/pokemon/species';
import { getPokemonVariety } from '@runvista/pokemon/varieties';

import { getPokemonSpriteUrls } from '../pokemon/pokemon-sprites';
import type { RunPokemon } from '../pokemon/pokemon.api';

import type { OverlayElement, OverlayLayout } from './overlay.api';

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
          }}
        >
          {layout.elements.map((element) => {
            const member = team.find((item) => item.teamSlot === element.slot);
            const selected = selectedSlot === element.slot;
            const active = activeSlot === element.slot;

            const formName = member ? getFormName(member) : null;
            const displayName = member?.nickname || formName;

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
                  className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-sm ${
                    element.visible ? 'bg-cyan-400/10' : 'bg-white/5 opacity-45'
                  }`}
                >
                  {member && element.visible ? (
                    <>
                      <div className="min-h-0 w-full flex-1">
                        <PokemonArtwork
                          key={`${member.id}-${member.pokemonId ?? 'default'}-${member.isShiny}`}
                          pokemon={member}
                        />
                      </div>

                      {(element.showNickname || element.showSpecies || element.showLevel) && (
                        <div className="w-full truncate bg-black/65 px-1 text-center text-[8px] leading-tight text-white sm:text-[10px]">
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
