const ITEM_SPRITE_BASE_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';

export interface PokeBall {
  key: string;
  name: string;
  imageUrl: string;
}

function createPokeBall(key: string, name: string): PokeBall {
  return {
    key,
    name,
    imageUrl: `${ITEM_SPRITE_BASE_URL}/${key}.png`,
  };
}

export const POKE_BALLS: readonly PokeBall[] = Object.freeze([
  createPokeBall('poke-ball', 'Poké Ball'),
  createPokeBall('great-ball', 'Super Ball'),
  createPokeBall('ultra-ball', 'Ultra Ball'),
  createPokeBall('master-ball', 'Master Ball'),
  createPokeBall('luxury-ball', 'Lujo Ball'),
  createPokeBall('premier-ball', 'Honor Ball'),
  createPokeBall('timer-ball', 'Cronos Ball'),
  createPokeBall('quick-ball', 'Veloz Ball'),
  createPokeBall('dusk-ball', 'Oscura Ball'),
  createPokeBall('heal-ball', 'Cura Ball'),
  createPokeBall('net-ball', 'Red Ball'),
  createPokeBall('nest-ball', 'Nido Ball'),
  createPokeBall('dive-ball', 'Buceo Ball'),
  createPokeBall('repeat-ball', 'Acopio Ball'),
  createPokeBall('safari-ball', 'Safari Ball'),
  createPokeBall('level-ball', 'Nivel Ball'),
]);

const POKE_BALLS_BY_KEY: ReadonlyMap<string, PokeBall> = new Map(
  POKE_BALLS.map((ball) => [ball.key, ball]),
);

export function getPokeBall(key: string): PokeBall | undefined {
  return POKE_BALLS_BY_KEY.get(key);
}

export function isPokeBallKey(value: string): boolean {
  return POKE_BALLS_BY_KEY.has(value);
}
