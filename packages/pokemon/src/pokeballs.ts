const ITEM_SPRITE_BASE_URL =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';

/**
 * Colores para dibujar la ball como vector. Son una representación
 * estilizada, no el arte oficial: sirven para mostrarla grande y nítida,
 * algo que el sprite de 30 px no permite.
 */
export interface PokeBallColors {
  top: string;
  bottom: string;
  accent: string | null;
}

export interface PokeBall {
  key: string;
  name: string;
  imageUrl: string;
  colors: PokeBallColors;
}

function createPokeBall(key: string, name: string, colors: PokeBallColors): PokeBall {
  return {
    key,
    name,
    imageUrl: `${ITEM_SPRITE_BASE_URL}/${key}.png`,
    colors,
  };
}

export const POKE_BALLS: readonly PokeBall[] = Object.freeze([
  createPokeBall('poke-ball', 'Poké Ball', { top: '#e53935', bottom: '#f5f5f5', accent: null }),
  createPokeBall('great-ball', 'Super Ball', {
    top: '#1e6fd6',
    bottom: '#f5f5f5',
    accent: '#e53935',
  }),
  createPokeBall('ultra-ball', 'Ultra Ball', {
    top: '#2b2b2b',
    bottom: '#f5f5f5',
    accent: '#fdd835',
  }),
  createPokeBall('master-ball', 'Master Ball', {
    top: '#7e3fbf',
    bottom: '#f5f5f5',
    accent: '#ec407a',
  }),
  createPokeBall('luxury-ball', 'Lujo Ball', {
    top: '#262626',
    bottom: '#262626',
    accent: '#e6b422',
  }),
  createPokeBall('premier-ball', 'Honor Ball', {
    top: '#f5f5f5',
    bottom: '#f5f5f5',
    accent: '#e53935',
  }),
  createPokeBall('timer-ball', 'Turno Ball', {
    top: '#f5f5f5',
    bottom: '#f5f5f5',
    accent: '#e53935',
  }),
  createPokeBall('quick-ball', 'Veloz Ball', {
    top: '#1e88e5',
    bottom: '#f5f5f5',
    accent: '#fdd835',
  }),
  createPokeBall('dusk-ball', 'Ocaso Ball', {
    top: '#2e7d32',
    bottom: '#263238',
    accent: '#ff7043',
  }),
  createPokeBall('heal-ball', 'Sana Ball', {
    top: '#f48fb1',
    bottom: '#f5f5f5',
    accent: '#ec407a',
  }),
  createPokeBall('net-ball', 'Malla Ball', {
    top: '#26a69a',
    bottom: '#263238',
    accent: '#80cbc4',
  }),
  createPokeBall('nest-ball', 'Nido Ball', {
    top: '#8bc34a',
    bottom: '#fdd835',
    accent: '#6d4c41',
  }),
  createPokeBall('dive-ball', 'Buceo Ball', {
    top: '#1565c0',
    bottom: '#4fc3f7',
    accent: '#e3f2fd',
  }),
  createPokeBall('repeat-ball', 'Acopio Ball', {
    top: '#fdd835',
    bottom: '#f5f5f5',
    accent: '#e53935',
  }),
  createPokeBall('safari-ball', 'Safari Ball', {
    top: '#6b8e23',
    bottom: '#c9a66b',
    accent: '#4e342e',
  }),
  createPokeBall('level-ball', 'Nivel Ball', {
    top: '#d32f2f',
    bottom: '#212121',
    accent: '#fafafa',
  }),
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
