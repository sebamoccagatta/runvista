import { useEffect, useState } from 'react';

import { getPokemonSpecies } from '@runvista/pokemon/species';
import { getPokemonVariety } from '@runvista/pokemon/varieties';

import { CreatePokemonForm } from './CreatePokemonForm';
import { EditPokemonDialog } from './EditPokemonDialog';
import { PokemonSprite } from './PokemonSprite';
import {
  getPokemonErrorMessage,
  listRunPokemon,
  moveRunPokemon,
  type MovePokemonInput,
  type RunPokemon,
} from './pokemon.api';

interface RunPokemonPanelProps {
  runId: string;
}

const TEAM_SLOTS = [1, 2, 3, 4, 5, 6] as const;

function getPokemonFormName(pokemon: RunPokemon): string {
  const variety = pokemon.pokemonId != null ? getPokemonVariety(pokemon.pokemonId) : undefined;

  return (
    variety?.displayName ??
    getPokemonSpecies(pokemon.speciesId)?.displayName ??
    `Pokémon #${pokemon.speciesId}`
  );
}

function getPokemonName(pokemon: RunPokemon): string {
  return pokemon.nickname || getPokemonFormName(pokemon);
}

interface PokemonCardProps {
  pokemon: RunPokemon;
  occupiedSlots: readonly number[];
  moving: boolean;
  onMove: (pokemon: RunPokemon, input: MovePokemonInput) => void;
  onEdit: (pokemon: RunPokemon) => void;
}

function PokemonCard({ pokemon, occupiedSlots, moving, onMove, onEdit }: PokemonCardProps) {
  const displayName = getPokemonName(pokemon);
  const formName = getPokemonFormName(pokemon);

  const hasNickname = Boolean(pokemon.nickname?.trim());
  const isFainted = pokemon.status === 'FAINTED';

  return (
    <article
      className={`group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-surface-raised transition-colors ${
        isFainted ? 'border-brand/25' : pokemon.isShiny ? 'border-accent/30' : 'border-white/10'
      }`}
    >
      <div
        className={`relative flex min-h-28 items-center justify-center overflow-hidden bg-gradient-to-b py-3 sm:min-h-32 ${
          isFainted
            ? 'from-brand/10 to-transparent'
            : pokemon.isShiny
              ? 'from-accent/10 to-transparent'
              : 'from-white/5 to-transparent'
        }`}
      >
        <PokemonSprite
          speciesId={pokemon.speciesId}
          pokemonId={pokemon.pokemonId ?? null}
          isShiny={pokemon.isShiny}
          size="md"
          loading="lazy"
          className={
            isFainted
              ? 'grayscale opacity-65'
              : 'transition-transform duration-200 group-hover:scale-105'
          }
        />

        {pokemon.isShiny && (
          <span
            aria-label="Shiny"
            title="Pokémon shiny"
            className="absolute right-2 top-2 rounded-full border border-accent/30 bg-canvas/85 px-2 py-1 text-xs text-accent"
          >
            ✨
          </span>
        )}

        {isFainted && (
          <span className="absolute left-2 top-2 rounded-full border border-brand/30 bg-canvas/85 px-2 py-1 text-[11px] font-bold text-brand">
            Baja
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h4
              className="min-w-0 truncate text-sm font-bold text-text-primary sm:text-base"
              title={displayName}
            >
              {displayName}
            </h4>

            <button
              type="button"
              aria-label={`Editar ${displayName}`}
              onClick={() => onEdit(pokemon)}
              disabled={moving}
              className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
            >
              Editar
            </button>
          </div>

          {hasNickname && <p className="truncate text-xs text-text-secondary">{formName}</p>}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-secondary">
            <span>#{String(pokemon.speciesId).padStart(4, '0')}</span>

            {pokemon.level !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span>Nv. {pokemon.level}</span>
              </>
            )}
          </div>
        </div>

        <label className="mt-auto block min-w-0 space-y-1.5">
          <span className="block text-[11px] font-medium text-text-secondary">Mover Pokémon</span>

          <select
            aria-label={`Mover ${displayName}`}
            value=""
            disabled={moving}
            onChange={(event) => {
              const destination = event.target.value;

              if (destination === 'BOX') {
                onMove(pokemon, { status: 'BOX' });
                return;
              }

              if (destination === 'FAINTED') {
                onMove(pokemon, { status: 'FAINTED' });
                return;
              }

              if (destination.startsWith('TEAM:')) {
                const teamSlot = Number(destination.slice('TEAM:'.length));

                if (Number.isInteger(teamSlot) && teamSlot >= 1 && teamSlot <= 6) {
                  onMove(pokemon, {
                    status: 'TEAM',
                    teamSlot,
                  });
                }
              }
            }}
            className="min-h-10 w-full min-w-0 rounded-lg border border-white/10 bg-surface px-2 text-[11px] text-text-primary outline-none transition-colors hover:border-white/20 focus:border-accent disabled:opacity-50 sm:px-3 sm:text-xs"
          >
            <option value="">Mover a...</option>

            <option value="BOX" disabled={pokemon.status === 'BOX'}>
              Caja
            </option>

            <option value="FAINTED" disabled={pokemon.status === 'FAINTED'}>
              Bajas
            </option>

            {TEAM_SLOTS.map((slot) => (
              <option key={slot} value={`TEAM:${slot}`} disabled={occupiedSlots.includes(slot)}>
                Equipo · Posición {slot}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}

interface EmptyTeamSlotProps {
  slot: number;
}

function EmptyTeamSlot({ slot }: EmptyTeamSlotProps) {
  return (
    <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-surface/50 p-3 text-center transition-colors hover:border-white/20">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-text-secondary">
        +
      </div>

      <p className="text-xs font-semibold text-text-secondary">Posición {slot} libre</p>
    </div>
  );
}

function RunPokemonPanelContent({ runId }: RunPokemonPanelProps) {
  const [pokemon, setPokemon] = useState<RunPokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void listRunPokemon(runId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setPokemon(result);
          setLoadError(null);
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(getPokemonErrorMessage(error));
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [runId]);

  async function reload() {
    setLoading(true);
    setLoadError(null);

    try {
      setPokemon(await listRunPokemon(runId));
    } catch (error) {
      setLoadError(getPokemonErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function handleCreated(created: RunPokemon) {
    setPokemon((current) => [...current, created]);
    setActionError(null);
  }

  function handleUpdated(updated: RunPokemon) {
    setPokemon((current) => current.map((item) => (item.id === updated.id ? updated : item)));

    setActionError(null);
  }

  async function handleMove(currentPokemon: RunPokemon, input: MovePokemonInput) {
    if (movingId !== null || editingId !== null) {
      return;
    }

    setMovingId(currentPokemon.id);
    setActionError(null);

    try {
      const updated = await moveRunPokemon(runId, currentPokemon.id, input);

      setPokemon((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setActionError(getPokemonErrorMessage(error));
    } finally {
      setMovingId(null);
    }
  }

  const team = pokemon.filter((item) => item.status === 'TEAM');

  const box = pokemon.filter((item) => item.status === 'BOX');

  const fainted = pokemon.filter((item) => item.status === 'FAINTED');

  const occupiedSlots = team
    .map((item) => item.teamSlot)
    .filter((slot): slot is number => slot !== null);

  const editingPokemon =
    editingId === null ? undefined : pokemon.find((item) => item.id === editingId);

  if (loading) {
    return (
      <p role="status" className="text-sm text-text-secondary">
        Cargando Pokémon...
      </p>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-3 rounded-card border border-brand/30 bg-surface p-5">
        <p role="alert" className="text-sm text-brand">
          {loadError}
        </p>

        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white"
        >
          Reintentar
        </button>
      </div>
    );
  }

  function renderPokemonCard(item: RunPokemon) {
    return (
      <PokemonCard
        key={item.id}
        pokemon={item}
        occupiedSlots={occupiedSlots}
        moving={movingId !== null}
        onMove={(selected, input) => {
          void handleMove(selected, input);
        }}
        onEdit={(selected) => {
          setEditingId(selected.id);
        }}
      />
    );
  }

  return (
    <section aria-label="Pokémon de la partida" className="min-w-0 space-y-7">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">Pokémon de la partida</h2>

        <p className="text-sm text-text-secondary">Administrá tu equipo, caja y bajas.</p>
      </div>

      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-brand/30 bg-brand/10 p-3 text-sm text-brand"
        >
          {actionError}
        </p>
      )}

      <section aria-label="Equipo Pokémon" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Equipo</h3>

            <p className="mt-1 text-xs text-text-secondary">Tus Pokémon activos</p>
          </div>

          <span className="rounded-full border border-white/10 bg-surface px-3 py-1 text-sm font-bold text-text-primary">
            {team.length} / 6
          </span>
        </div>

        <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-3 lg:gap-4">
          {TEAM_SLOTS.map((slot) => {
            const member = team.find((item) => item.teamSlot === slot);

            return (
              <div key={slot} className="flex min-w-0 flex-col gap-2">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary sm:text-xs">
                  Posición {slot}
                </p>

                <div className="flex flex-1 flex-col">
                  {member ? renderPokemonCard(member) : <EmptyTeamSlot slot={slot} />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-label="Caja Pokémon" className="space-y-4 border-t border-white/10 pt-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Caja</h3>

            <p className="mt-1 text-xs text-text-secondary">Pokémon almacenados</p>
          </div>

          <span className="text-sm text-text-secondary">{box.length} Pokémon</span>
        </div>

        {box.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-text-secondary">
            Todavía no hay Pokémon en la caja.
          </p>
        ) : (
          <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-3 lg:gap-4">
            {box.map(renderPokemonCard)}
          </div>
        )}
      </section>

      <section aria-label="Bajas Pokémon" className="space-y-4 border-t border-white/10 pt-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Bajas</h3>

            <p className="mt-1 text-xs text-text-secondary">Pokémon perdidos durante la aventura</p>
          </div>

          <span className="text-sm text-text-secondary">{fainted.length} Pokémon</span>
        </div>

        {fainted.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-text-secondary">
            No hay bajas registradas.
          </p>
        ) : (
          <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-3 lg:gap-4">
            {fainted.map(renderPokemonCard)}
          </div>
        )}
      </section>

      <div className="border-t border-white/10 pt-7">
        <CreatePokemonForm runId={runId} occupiedSlots={occupiedSlots} onCreated={handleCreated} />
      </div>

      {editingPokemon && (
        <EditPokemonDialog
          key={editingPokemon.id}
          pokemon={editingPokemon}
          onUpdated={handleUpdated}
          onClose={() => setEditingId(null)}
        />
      )}
    </section>
  );
}

export function RunPokemonPanel({ runId }: RunPokemonPanelProps) {
  return <RunPokemonPanelContent key={runId} runId={runId} />;
}
