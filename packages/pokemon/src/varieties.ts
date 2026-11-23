import { getPokemonSpecies, isPokemonSpeciesId } from './species.js';

import { POKEMON_VARIETIES_DATA } from './varieties-data.js';

export interface PokemonVariety {
  speciesId: number;
  pokemonId: number;
  name: string;
  displayName: string;
  isDefault: boolean;
}

function formatName(value: string): string {
  return value
    .split('-')
    .map((part) => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function createDisplayName(speciesId: number, varietyName: string, isDefault: boolean): string {
  const species = getPokemonSpecies(speciesId);

  if (!species) {
    throw new Error(`Unknown Pokemon species: ${speciesId}`);
  }

  if (isDefault) {
    return species.displayName;
  }

  const prefix = `${species.name}-`;

  if (varietyName.startsWith(prefix)) {
    const suffix = varietyName.slice(prefix.length);

    return `${species.displayName} ${formatName(suffix)}`;
  }

  return formatName(varietyName);
}

export const POKEMON_VARIETIES: readonly PokemonVariety[] = POKEMON_VARIETIES_DATA.map(
  (variety) => ({
    ...variety,
    displayName: createDisplayName(variety.speciesId, variety.name, variety.isDefault),
  }),
);

const varietiesByPokemonId = new Map(
  POKEMON_VARIETIES.map((variety) => [variety.pokemonId, variety]),
);

const varietiesBySpeciesId = new Map<number, PokemonVariety[]>();

for (const variety of POKEMON_VARIETIES) {
  const existing = varietiesBySpeciesId.get(variety.speciesId) ?? [];

  existing.push(variety);
  varietiesBySpeciesId.set(variety.speciesId, existing);
}

export function getPokemonVariety(pokemonId: number): PokemonVariety | undefined {
  return varietiesByPokemonId.get(pokemonId);
}

export function getPokemonVarieties(speciesId: number): readonly PokemonVariety[] {
  if (!isPokemonSpeciesId(speciesId)) {
    return [];
  }

  return varietiesBySpeciesId.get(speciesId) ?? [];
}

export function getDefaultPokemonVariety(speciesId: number): PokemonVariety | undefined {
  return getPokemonVarieties(speciesId).find((variety) => variety.isDefault);
}

export function isPokemonVarietyForSpecies(speciesId: number, pokemonId: number): boolean {
  const variety = getPokemonVariety(pokemonId);

  return variety?.speciesId === speciesId;
}
