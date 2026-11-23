import { isPokemonSpeciesId } from '@runvista/pokemon/species';
import { getDefaultPokemonVariety, isPokemonVarietyForSpecies } from '@runvista/pokemon/varieties';

const SPRITE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

export function getPokemonSpriteUrls(
  speciesId: number,
  isShiny = false,
  pokemonId?: number | null,
): string[] {
  if (!isPokemonSpeciesId(speciesId)) {
    return [];
  }

  const defaultPokemonId = getDefaultPokemonVariety(speciesId)?.pokemonId ?? speciesId;

  const selectedPokemonId =
    pokemonId != null && isPokemonVarietyForSpecies(speciesId, pokemonId)
      ? pokemonId
      : defaultPokemonId;

  const pokemonIds = [...new Set([selectedPokemonId, defaultPokemonId])];

  const suffix = isShiny ? '/shiny' : '';

  return pokemonIds.flatMap((id) => [
    `${SPRITE_BASE_URL}/other/official-artwork${suffix}/${id}.png`,
    `${SPRITE_BASE_URL}${suffix}/${id}.png`,
  ]);
}
