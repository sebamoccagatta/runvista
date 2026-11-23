import { isPokemonSpeciesId } from '@runvista/pokemon/species';

const SPRITE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

export function getPokemonSpriteUrls(speciesId: number, isShiny = false): string[] {
  if (!isPokemonSpeciesId(speciesId)) {
    return [];
  }

  if (isShiny) {
    return [
      `${SPRITE_BASE_URL}/other/official-artwork/shiny/${speciesId}.png`,
      `${SPRITE_BASE_URL}/shiny/${speciesId}.png`,
    ];
  }

  return [
    `${SPRITE_BASE_URL}/other/official-artwork/${speciesId}.png`,
    `${SPRITE_BASE_URL}/${speciesId}.png`,
  ];
}
