import { POKEMON_SPECIES_DATA } from './species-data.js';

export interface PokemonSpecies {
  id: number;
  name: string;
  displayName: string;
}

function formatDisplayName(name: string): string {
  return name
    .split('-')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export const POKEMON_SPECIES: readonly PokemonSpecies[] = POKEMON_SPECIES_DATA.map((species) => ({
  id: species.id,
  name: species.name,
  displayName: formatDisplayName(species.name),
}));

const speciesById = new Map(POKEMON_SPECIES.map((species) => [species.id, species]));

export function getPokemonSpecies(id: number): PokemonSpecies | undefined {
  return speciesById.get(id);
}

export function isPokemonSpeciesId(id: number): boolean {
  return speciesById.has(id);
}

export function searchPokemonSpecies(query: string, limit = 20): PokemonSpecies[] {
  const normalized = normalizeSearch(query);

  if (!normalized) {
    return [];
  }

  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;

  if (safeLimit === 0) {
    return [];
  }

  return POKEMON_SPECIES.filter((species) => {
    return (
      String(species.id) === normalized ||
      normalizeSearch(species.name).includes(normalized) ||
      normalizeSearch(species.displayName).includes(normalized)
    );
  }).slice(0, safeLimit);
}
