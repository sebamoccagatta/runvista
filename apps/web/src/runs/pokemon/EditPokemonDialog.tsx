import { useEffect, useId, useRef } from 'react';

import { getPokemonSpecies } from '@runvista/pokemon/species';
import { getPokemonVariety } from '@runvista/pokemon/varieties';

import { EditPokemonForm } from './EditPokemonForm';
import { PokemonSprite } from './PokemonSprite';
import type { RunPokemon } from './pokemon.api';

interface EditPokemonDialogProps {
  pokemon: RunPokemon;
  onUpdated: (pokemon: RunPokemon) => void;
  onClose: () => void;
}

export function EditPokemonDialog({ pokemon, onUpdated, onClose }: EditPokemonDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const species = getPokemonSpecies(pokemon.speciesId);

  const variety = pokemon.pokemonId != null ? getPokemonVariety(pokemon.pokemonId) : undefined;

  const formName = variety?.displayName ?? species?.displayName ?? `Pokémon #${pokemon.speciesId}`;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) {
        dialog.showModal();
      }

      return () => {
        if (dialog.open) {
          dialog.close();
        }
      };
    }
  }, []);

  function handleUpdated(updated: RunPokemon) {
    onUpdated(updated);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-surface p-0 text-text-primary shadow-2xl backdrop:bg-black/75"
    >
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 id={titleId} className="text-xl font-bold">
              Editar Pokémon
            </h2>

            <p className="text-sm text-text-secondary">Modificá los datos de este Pokémon.</p>
          </div>

          <button
            type="button"
            aria-label="Cerrar edición"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-xl text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
          >
            ×
          </button>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-surface-raised p-3">
          <PokemonSprite
            speciesId={pokemon.speciesId}
            pokemonId={pokemon.pokemonId ?? null}
            isShiny={pokemon.isShiny}
            size="sm"
            loading="eager"
          />

          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate font-bold">{pokemon.nickname || formName}</p>

            <p className="text-sm text-text-secondary">
              {formName} · #{String(pokemon.speciesId).padStart(4, '0')}
            </p>

            {pokemon.level !== null && (
              <p className="text-xs text-text-secondary">Nv. {pokemon.level}</p>
            )}
          </div>

          {pokemon.isShiny && (
            <span aria-label="Shiny" className="self-start text-accent">
              ✨
            </span>
          )}
        </div>

        <EditPokemonForm
          key={pokemon.id}
          pokemon={pokemon}
          onUpdated={handleUpdated}
          onCancel={onClose}
          embedded
        />
      </div>
    </dialog>
  );
}
