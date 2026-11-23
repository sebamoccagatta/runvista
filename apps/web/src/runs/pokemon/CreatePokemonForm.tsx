import { useState, type FormEvent } from 'react';

import { isPokemonVarietyForSpecies } from '@runvista/pokemon/varieties';

import {
  createRunPokemon,
  getPokemonErrorMessage,
  type PokemonStatus,
  type RunPokemon,
} from './pokemon.api';
import { PokemonSpeciesSelect } from './PokemonSpeciesSelect';
import { PokemonVarietySelect } from './PokemonVarietySelect';

interface CreatePokemonFormProps {
  runId: string;
  onCreated: (pokemon: RunPokemon) => void;
  occupiedSlots?: readonly number[];
}

const STATUS_OPTIONS: {
  value: PokemonStatus;
  label: string;
}[] = [
  { value: 'TEAM', label: 'Equipo' },
  { value: 'BOX', label: 'Caja' },
  { value: 'FAINTED', label: 'Bajas' },
];

const TEAM_SLOTS = [1, 2, 3, 4, 5, 6] as const;

export function CreatePokemonForm({
  runId,
  onCreated,
  occupiedSlots = [],
}: CreatePokemonFormProps) {
  const [speciesId, setSpeciesId] = useState<number | null>(null);
  const [pokemonId, setPokemonId] = useState<number | null>(null);
  const [nickname, setNickname] = useState('');
  const [level, setLevel] = useState('');
  const [isShiny, setIsShiny] = useState(false);
  const [status, setStatus] = useState<PokemonStatus>('BOX');
  const [teamSlot, setTeamSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedLevel = level.trim() === '' ? null : Number(level);

  const validLevel =
    parsedLevel === null ||
    (Number.isInteger(parsedLevel) && parsedLevel >= 1 && parsedLevel <= 100);

  const validNickname = nickname.trim().length <= 50;

  const validSlot = status !== 'TEAM' || (teamSlot !== null && !occupiedSlots.includes(teamSlot));

  const validVariety =
    pokemonId === null || (speciesId !== null && isPokemonVarietyForSpecies(speciesId, pokemonId));

  const canSubmit =
    speciesId !== null && validLevel && validNickname && validSlot && validVariety && !saving;

  function resetForm() {
    setSpeciesId(null);
    setPokemonId(null);
    setNickname('');
    setLevel('');
    setIsShiny(false);
    setStatus('BOX');
    setTeamSlot(null);
    setError(null);
  }

  function changeSpecies(nextSpeciesId: number | null) {
    setSpeciesId(nextSpeciesId);
    setPokemonId(null);
    setError(null);
  }

  function changeStatus(nextStatus: PokemonStatus) {
    setStatus(nextStatus);
    setTeamSlot(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || speciesId === null || saving) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const pokemon = await createRunPokemon(runId, {
        speciesId,
        ...(pokemonId !== null ? { pokemonId } : {}),
        nickname: nickname.trim() || null,
        level: parsedLevel,
        isShiny,
        status,
        ...(status === 'TEAM' ? { teamSlot } : {}),
      });

      resetForm();
      onCreated(pokemon);
    } catch (cause) {
      setError(getPokemonErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-5 rounded-card border border-white/10 bg-surface p-5 sm:p-6"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-text-primary">Registrar Pokémon</h2>

        <p className="text-sm text-text-secondary">Agregá un Pokémon a esta partida.</p>
      </div>

      <fieldset disabled={saving} className="space-y-5">
        <PokemonSpeciesSelect value={speciesId} onChange={changeSpecies} disabled={saving} />

        <PokemonVarietySelect
          speciesId={speciesId}
          value={pokemonId}
          onChange={(nextPokemonId) => {
            setPokemonId(nextPokemonId);
            setError(null);
          }}
          disabled={saving}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="pokemon-nickname" className="block text-sm font-semibold">
              Apodo
            </label>

            <input
              id="pokemon-nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={50}
              placeholder="Opcional"
              className="min-h-12 w-full rounded-xl border border-white/10 bg-surface-raised px-3 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="pokemon-level" className="block text-sm font-semibold">
              Nivel
            </label>

            <input
              id="pokemon-level"
              type="number"
              min={1}
              max={100}
              step={1}
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              aria-invalid={!validLevel}
              placeholder="Opcional"
              className="min-h-12 w-full rounded-xl border border-white/10 bg-surface-raised px-3 text-sm text-text-primary outline-none focus:border-accent"
            />

            {!validLevel && (
              <p role="alert" className="text-xs text-brand">
                El nivel debe estar entre 1 y 100.
              </p>
            )}
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface-raised px-4 py-3">
          <input
            type="checkbox"
            checked={isShiny}
            onChange={(event) => setIsShiny(event.target.checked)}
            className="h-4 w-4 accent-accent"
          />

          <span className="text-sm font-semibold">Pokémon shiny</span>

          <span aria-hidden="true" className="ml-auto">
            ✨
          </span>
        </label>

        <div className="space-y-2">
          <label htmlFor="pokemon-status" className="block text-sm font-semibold">
            Destino inicial
          </label>

          <select
            id="pokemon-status"
            value={status}
            onChange={(event) => changeStatus(event.target.value as PokemonStatus)}
            className="min-h-12 w-full rounded-xl border border-white/10 bg-surface-raised px-3 text-sm text-text-primary outline-none focus:border-accent"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {status === 'TEAM' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Posición del equipo</p>

            <div
              role="group"
              aria-label="Posición del equipo"
              className="grid grid-cols-3 gap-2 sm:grid-cols-6"
            >
              {TEAM_SLOTS.map((slot) => {
                const occupied = occupiedSlots.includes(slot);
                const selected = teamSlot === slot;

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={occupied}
                    aria-pressed={selected}
                    aria-label={`Posición ${slot}${occupied ? ', ocupada' : ''}`}
                    onClick={() => {
                      setTeamSlot(slot);
                      setError(null);
                    }}
                    className={`min-h-12 rounded-xl border text-sm font-bold transition-colors ${
                      selected
                        ? 'border-accent bg-accent/15 text-accent'
                        : occupied
                          ? 'border-white/5 bg-white/5 text-text-secondary/40'
                          : 'border-white/10 bg-surface-raised text-text-primary hover:border-accent/50'
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-text-secondary">
              Las posiciones ocupadas no se pueden seleccionar.
            </p>
          </div>
        )}
      </fieldset>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-brand"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={resetForm}
          className="min-h-12 rounded-xl border border-white/10 px-5 text-sm font-semibold text-text-secondary hover:bg-white/5 disabled:opacity-50"
        >
          Limpiar
        </button>

        <button
          type="submit"
          disabled={!canSubmit}
          className="min-h-12 rounded-xl bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Registrar Pokémon'}
        </button>
      </div>
    </form>
  );
}
