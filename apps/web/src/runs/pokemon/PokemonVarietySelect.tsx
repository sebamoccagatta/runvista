import { useId } from 'react';

import { getPokemonVarieties, isPokemonVarietyForSpecies } from '@runvista/pokemon/varieties';

interface PokemonVarietySelectProps {
  speciesId: number | null;
  value: number | null;
  onChange: (pokemonId: number | null) => void;
  disabled?: boolean;
}

export function PokemonVarietySelect({
  speciesId,
  value,
  onChange,
  disabled = false,
}: PokemonVarietySelectProps) {
  const id = useId();

  const varieties = speciesId === null ? [] : getPokemonVarieties(speciesId);

  const alternativeVarieties = varieties.filter((variety) => !variety.isDefault);

  if (speciesId === null || alternativeVarieties.length === 0) {
    return null;
  }

  const currentValue =
    value !== null && isPokemonVarietyForSpecies(speciesId, value) ? value : null;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-text-primary">
        Forma del Pokémon
      </label>

      <select
        id={id}
        value={currentValue ?? ''}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = event.target.value;

          onChange(nextValue === '' ? null : Number(nextValue));
        }}
        className="min-h-12 w-full rounded-xl border border-white/10 bg-surface-raised px-3 text-sm text-text-primary outline-none transition-colors hover:border-accent/50 focus:border-accent disabled:opacity-50"
      >
        <option value="">Forma predeterminada</option>

        {alternativeVarieties.map((variety) => (
          <option key={variety.pokemonId} value={variety.pokemonId}>
            {variety.displayName}
          </option>
        ))}
      </select>

      <p className="text-xs text-text-secondary">
        Elegí una variante regional, megaevolución u otra forma disponible.
      </p>
    </div>
  );
}
