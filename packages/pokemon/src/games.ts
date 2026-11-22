export interface PokemonGame {
  id: string;
  name: string;
  generation: number;
}

export const POKEMON_GAMES = [
  // Generación I
  { id: 'red', name: 'Pokémon Rojo', generation: 1 },
  { id: 'blue', name: 'Pokémon Azul', generation: 1 },
  { id: 'yellow', name: 'Pokémon Amarillo', generation: 1 },

  // Generación II
  { id: 'gold', name: 'Pokémon Oro', generation: 2 },
  { id: 'silver', name: 'Pokémon Plata', generation: 2 },
  { id: 'crystal', name: 'Pokémon Cristal', generation: 2 },

  // Generación III
  { id: 'ruby', name: 'Pokémon Rubí', generation: 3 },
  { id: 'sapphire', name: 'Pokémon Zafiro', generation: 3 },
  { id: 'emerald', name: 'Pokémon Esmeralda', generation: 3 },
  { id: 'firered', name: 'Pokémon Rojo Fuego', generation: 3 },
  { id: 'leafgreen', name: 'Pokémon Verde Hoja', generation: 3 },

  // Generación IV
  { id: 'diamond', name: 'Pokémon Diamante', generation: 4 },
  { id: 'pearl', name: 'Pokémon Perla', generation: 4 },
  { id: 'platinum', name: 'Pokémon Platino', generation: 4 },
  { id: 'heartgold', name: 'Pokémon Oro HeartGold', generation: 4 },
  { id: 'soulsilver', name: 'Pokémon Plata SoulSilver', generation: 4 },

  // Generación V
  { id: 'black', name: 'Pokémon Negro', generation: 5 },
  { id: 'white', name: 'Pokémon Blanco', generation: 5 },
  { id: 'black-2', name: 'Pokémon Negro 2', generation: 5 },
  { id: 'white-2', name: 'Pokémon Blanco 2', generation: 5 },

  // Generación VI
  { id: 'x', name: 'Pokémon X', generation: 6 },
  { id: 'y', name: 'Pokémon Y', generation: 6 },
  { id: 'omega-ruby', name: 'Pokémon Rubí Omega', generation: 6 },
  { id: 'alpha-sapphire', name: 'Pokémon Zafiro Alfa', generation: 6 },

  // Generación VII
  { id: 'sun', name: 'Pokémon Sol', generation: 7 },
  { id: 'moon', name: 'Pokémon Luna', generation: 7 },
  { id: 'ultra-sun', name: 'Pokémon Ultrasol', generation: 7 },
  { id: 'ultra-moon', name: 'Pokémon Ultraluna', generation: 7 },
  { id: 'lets-go-pikachu', name: "Pokémon Let's Go Pikachu", generation: 7 },
  { id: 'lets-go-eevee', name: "Pokémon Let's Go Eevee", generation: 7 },

  // Generación VIII
  { id: 'sword', name: 'Pokémon Espada', generation: 8 },
  { id: 'shield', name: 'Pokémon Escudo', generation: 8 },
  { id: 'brilliant-diamond', name: 'Pokémon Diamante Brillante', generation: 8 },
  { id: 'shining-pearl', name: 'Pokémon Perla Reluciente', generation: 8 },
  { id: 'legends-arceus', name: 'Leyendas Pokémon: Arceus', generation: 8 },

  // Generación IX
  { id: 'scarlet', name: 'Pokémon Escarlata', generation: 9 },
  { id: 'violet', name: 'Pokémon Púrpura', generation: 9 },
  { id: 'legends-za', name: 'Leyendas Pokémon: Z-A', generation: 9 },
] as const satisfies readonly PokemonGame[];

export type PokemonGameId = (typeof POKEMON_GAMES)[number]['id'];

export function getPokemonGame(id: string): PokemonGame | undefined {
  return POKEMON_GAMES.find((game) => game.id === id);
}

export function isPokemonGameId(id: string): id is PokemonGameId {
  return getPokemonGame(id) !== undefined;
}

export function getPokemonGamesByGeneration(generation: number): PokemonGame[] {
  return POKEMON_GAMES.filter((game) => game.generation === generation);
}
