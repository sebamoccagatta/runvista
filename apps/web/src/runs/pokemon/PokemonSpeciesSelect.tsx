import { useId, useState, type KeyboardEvent } from 'react';

import { getPokemonSpecies, searchPokemonSpecies } from '@runvista/pokemon/species';

interface PokemonSpeciesSelectProps {
  value: number | null;
  onChange: (speciesId: number | null) => void;
  disabled?: boolean;
}

interface SearchState {
  speciesId: number | null;
  query: string;
}

function getSpeciesName(speciesId: number | null): string {
  if (speciesId === null) {
    return '';
  }

  return getPokemonSpecies(speciesId)?.displayName ?? '';
}

export function PokemonSpeciesSelect({
  value,
  onChange,
  disabled = false,
}: PokemonSpeciesSelectProps) {
  const inputId = useId();
  const resultsId = useId();

  const [search, setSearch] = useState<SearchState>({
    speciesId: value,
    query: getSpeciesName(value),
  });

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Si el padre cambia la especie seleccionada,
  // usamos su valor sin necesitar un useEffect.
  const query = search.speciesId === value ? search.query : getSpeciesName(value);

  const selectedSpecies = value === null ? undefined : getPokemonSpecies(value);

  const results = open ? searchPokemonSpecies(query, 8) : [];

  function selectSpecies(speciesId: number) {
    const species = getPokemonSpecies(speciesId);

    if (!species) {
      return;
    }

    setSearch({
      speciesId,
      query: species.displayName,
    });

    setOpen(false);
    setActiveIndex(0);

    onChange(speciesId);
  }

  function clearSelection() {
    setSearch({
      speciesId: null,
      query: '',
    });

    setOpen(false);
    setActiveIndex(0);

    onChange(null);
  }

  function handleQueryChange(nextQuery: string) {
    setSearch({
      speciesId: null,
      query: nextQuery,
    });

    setOpen(true);
    setActiveIndex(0);

    if (value !== null) {
      onChange(null);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (!open || results.length === 0) {
      if (event.key === 'ArrowDown' && query.trim()) {
        event.preventDefault();
        setOpen(true);
      }

      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      setActiveIndex((current) => (current + 1) % results.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      setActiveIndex((current) => (current - 1 + results.length) % results.length);
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      const species = results[activeIndex];

      if (species) {
        selectSpecies(species.id);
      }
    }
  }

  return (
    <div className="space-y-3">
      <label htmlFor={inputId} className="block text-sm font-semibold">
        Especie Pokémon
      </label>

      <div className="relative">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-surface-raised px-3 transition-colors focus-within:border-accent">
          <span aria-hidden="true" className="text-lg text-text-secondary">
            ⌕
          </span>

          <input
            id={inputId}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && results.length > 0}
            aria-controls={resultsId}
            aria-activedescendant={
              open && results[activeIndex] ? `${resultsId}-${results[activeIndex].id}` : undefined
            }
            value={query}
            disabled={disabled}
            autoComplete="off"
            placeholder="Buscar por nombre o Pokédex..."
            className="min-h-12 w-full min-w-0 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
            onChange={(event) => handleQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.trim() && value === null) {
                setOpen(true);
              }
            }}
            onBlur={(event) => {
              const next = event.relatedTarget;

              if (
                !(next instanceof HTMLElement) ||
                !event.currentTarget.parentElement?.parentElement?.contains(next)
              ) {
                setOpen(false);
              }
            }}
          />

          {(query || value !== null) && !disabled && (
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Limpiar especie"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-white/10 hover:text-text-primary"
            >
              ×
            </button>
          )}
        </div>

        {open && query.trim() && (
          <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-white/10 bg-surface p-2 shadow-xl">
            {results.length > 0 ? (
              <div id={resultsId} role="listbox" aria-label="Resultados de Pokémon">
                {results.map((species, index) => (
                  <button
                    key={species.id}
                    id={`${resultsId}-${species.id}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    disabled={disabled}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectSpecies(species.id)}
                    className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      index === activeIndex
                        ? 'bg-white/10 text-text-primary'
                        : 'text-text-secondary hover:bg-white/5'
                    }`}
                  >
                    <span className="font-semibold">{species.displayName}</span>

                    <span className="shrink-0 text-xs text-text-secondary">
                      #{String(species.id).padStart(4, '0')}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p role="status" className="px-3 py-4 text-sm text-text-secondary">
                No encontramos Pokémon con ese nombre o número.
              </p>
            )}
          </div>
        )}
      </div>

      {selectedSpecies && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
          <div>
            <p className="text-sm font-bold">{selectedSpecies.displayName}</p>

            <p className="mt-1 text-xs text-text-secondary">
              Pokédex Nacional #{String(selectedSpecies.id).padStart(4, '0')}
            </p>
          </div>

          <span className="text-xs font-semibold text-accent">Seleccionado</span>
        </div>
      )}

      {!selectedSpecies && (
        <p className="text-xs text-text-secondary">
          Buscá una especie y seleccioná un resultado para continuar.
        </p>
      )}
    </div>
  );
}
