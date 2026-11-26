import { useState, type FormEvent } from 'react';

import { PokeBallSelect } from './PokeBallSelect';

import { getPokemonSpecies } from '@runvista/pokemon/species';
import { isPokemonVarietyForSpecies } from '@runvista/pokemon/varieties';

import {
  getPokemonErrorMessage,
  updateRunPokemon,
  type RunPokemon,
  type UpdatePokemonInput,
} from './pokemon.api';
import { PokemonVarietySelect } from './PokemonVarietySelect';

interface EditPokemonFormProps {
  pokemon: RunPokemon;
  onUpdated: (pokemon: RunPokemon) => void;
  onCancel: () => void;
  embedded?: boolean;
}

export function EditPokemonForm({
  pokemon,
  onUpdated,
  onCancel,
  embedded = false,
}: EditPokemonFormProps) {
  const [nickname, setNickname] = useState(pokemon.nickname ?? '');

  const [level, setLevel] = useState(pokemon.level?.toString() ?? '');

  const [isShiny, setIsShiny] = useState(pokemon.isShiny);

  const [pokeBall, setPokeBall] = useState<string | null>(pokemon.pokeBall ?? null);

  const [pokemonId, setPokemonId] = useState<number | null>(pokemon.pokemonId ?? null);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const species = getPokemonSpecies(pokemon.speciesId);

  const speciesName = species?.displayName ?? `Pokémon #${pokemon.speciesId}`;

  const parsedNickname = nickname.trim() || null;

  const parsedLevel = level.trim() === '' ? null : Number(level);

  const validNickname = nickname.trim().length <= 50;

  const validLevel =
    parsedLevel === null ||
    (Number.isInteger(parsedLevel) && parsedLevel >= 1 && parsedLevel <= 100);

  const validVariety =
    pokemonId === null || isPokemonVarietyForSpecies(pokemon.speciesId, pokemonId);

  const nicknameChanged = parsedNickname !== pokemon.nickname;

  const levelChanged = parsedLevel !== pokemon.level;

  const shinyChanged = isShiny !== pokemon.isShiny;

  const pokeBallChanged = pokeBall !== (pokemon.pokeBall ?? null);

  const varietyChanged = pokemonId !== (pokemon.pokemonId ?? null);

  const hasChanges =
    nicknameChanged || levelChanged || shinyChanged || varietyChanged || pokeBallChanged;

  const canSubmit = validNickname && validLevel && validVariety && hasChanges && !saving;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const changes: UpdatePokemonInput = {
      ...(nicknameChanged ? { nickname: parsedNickname } : {}),
      ...(levelChanged ? { level: parsedLevel } : {}),
      ...(shinyChanged ? { isShiny } : {}),
      ...(pokeBallChanged ? { pokeBall } : {}),
      ...(varietyChanged ? { pokemonId } : {}),
    };

    setSaving(true);
    setError(null);

    try {
      const updated = await updateRunPokemon(pokemon.runId, pokemon.id, changes);

      onUpdated(updated);
    } catch (cause) {
      setError(getPokemonErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      aria-label={`Editar ${pokemon.nickname || speciesName}`}
      onSubmit={(event) => void handleSubmit(event)}
      className={
        embedded ? 'space-y-4' : 'space-y-4 rounded-xl border border-accent/20 bg-surface p-4'
      }
    >
      {!embedded && (
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-text-primary">Editar Pokémon</h3>

          <p className="text-xs text-text-secondary">
            {speciesName} · #{String(pokemon.speciesId).padStart(4, '0')}
          </p>
        </div>
      )}

      <fieldset disabled={saving} className="space-y-4">
        <PokemonVarietySelect
          speciesId={pokemon.speciesId}
          value={pokemonId}
          onChange={(nextPokemonId) => {
            setPokemonId(nextPokemonId);
            setError(null);
          }}
          disabled={saving}
        />

        <div className="space-y-2">
          <label htmlFor={`edit-nickname-${pokemon.id}`} className="block text-xs font-semibold">
            Apodo
          </label>

          <input
            id={`edit-nickname-${pokemon.id}`}
            type="text"
            value={nickname}
            maxLength={50}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Sin apodo"
            className="min-h-11 w-full rounded-lg border border-white/10 bg-surface-raised px-3 text-sm text-text-primary outline-none focus:border-accent"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor={`edit-level-${pokemon.id}`} className="block text-xs font-semibold">
            Nivel
          </label>

          <input
            id={`edit-level-${pokemon.id}`}
            type="number"
            min={1}
            max={100}
            step={1}
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            aria-invalid={!validLevel}
            placeholder="Sin nivel"
            className="min-h-11 w-full rounded-lg border border-white/10 bg-surface-raised px-3 text-sm text-text-primary outline-none focus:border-accent"
          />

          {!validLevel && (
            <p role="alert" className="text-xs text-brand">
              El nivel debe estar entre 1 y 100.
            </p>
          )}
        </div>

        <PokeBallSelect
          id={`edit-poke-ball-${pokemon.id}`}
          value={pokeBall}
          onChange={setPokeBall}
          disabled={saving}
        />

        <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-surface-raised px-3 py-3">
          <input
            type="checkbox"
            checked={isShiny}
            onChange={(event) => setIsShiny(event.target.checked)}
            className="h-4 w-4 accent-accent"
          />

          <span className="text-xs font-semibold">Pokémon shiny</span>

          <span aria-hidden="true" className="ml-auto">
            ✨
          </span>
        </label>
      </fieldset>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-brand/30 bg-brand/10 p-3 text-xs text-brand"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="min-h-10 rounded-lg border border-white/10 px-4 text-xs font-semibold text-text-secondary hover:bg-white/5 disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={!canSubmit}
          className="min-h-10 rounded-lg bg-brand px-4 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
