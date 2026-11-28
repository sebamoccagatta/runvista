/**
 * Medallas de gimnasio por juego. Solo tienen datos los juegos que se fueron
 * cargando; para el resto `getGameBadges` devuelve una lista vacía y el
 * rastreador de medallas no se ofrece.
 */

/** Colores con los que se dibuja el icono de la medalla (arte propio, no el oficial). */
export interface BadgeColors {
  primary: string;
  secondary: string;
}

export interface GameBadge {
  /** Identifica la medalla dentro de su región, igual en todos los juegos de la región. */
  key: string;
  /** Solo para accesibilidad: la interfaz muestra el icono, no el nombre. */
  name: string;
  leader: string;
  /** Nivel del Pokémon más alto del líder en este juego, sin aumento. */
  levelCap: number;
  colors: BadgeColors;
}

/** Aumento máximo del nivel de los rivales que se puede configurar, en porcentaje. */
export const MAX_LEVEL_CAP_INCREASE = 100;

const MAX_POKEMON_LEVEL = 100;

interface RegionBadge {
  key: string;
  name: string;
  leader: string;
  colors: BadgeColors;
}

const KANTO_BADGES: readonly RegionBadge[] = [
  {
    key: 'kanto-boulder',
    name: 'Medalla Roca',
    leader: 'Brock',
    colors: { primary: '#9e8f7a', secondary: '#5d4b3a' },
  },
  {
    key: 'kanto-cascade',
    name: 'Medalla Cascada',
    leader: 'Misty',
    colors: { primary: '#4fc3f7', secondary: '#0277bd' },
  },
  {
    key: 'kanto-thunder',
    name: 'Medalla Trueno',
    leader: 'Teniente Surge',
    colors: { primary: '#fdd835', secondary: '#f57f17' },
  },
  {
    key: 'kanto-rainbow',
    name: 'Medalla Arcoíris',
    leader: 'Erika',
    colors: { primary: '#66bb6a', secondary: '#ec407a' },
  },
  {
    key: 'kanto-soul',
    name: 'Medalla Alma',
    leader: 'Koga',
    colors: { primary: '#f06292', secondary: '#880e4f' },
  },
  {
    key: 'kanto-marsh',
    name: 'Medalla Pantano',
    leader: 'Sabrina',
    colors: { primary: '#ffca28', secondary: '#6a1b9a' },
  },
  {
    key: 'kanto-volcano',
    name: 'Medalla Volcán',
    leader: 'Blaine',
    colors: { primary: '#ef5350', secondary: '#b71c1c' },
  },
  {
    key: 'kanto-earth',
    name: 'Medalla Tierra',
    leader: 'Giovanni',
    colors: { primary: '#8d6e63', secondary: '#2e7d32' },
  },
];

function withLevelCaps(
  region: readonly RegionBadge[],
  levelCaps: readonly number[],
): readonly GameBadge[] {
  if (region.length !== levelCaps.length) {
    throw new Error('Each badge needs exactly one level cap');
  }

  return Object.freeze(
    region.map((badge, index) => Object.freeze({ ...badge, levelCap: levelCaps[index] as number })),
  );
}

// Nivel más alto del equipo de cada líder (fuente: Serebii).
const KANTO_RED_BLUE = withLevelCaps(KANTO_BADGES, [14, 21, 24, 29, 43, 43, 47, 50]);
const KANTO_YELLOW = withLevelCaps(KANTO_BADGES, [12, 21, 28, 32, 50, 50, 54, 55]);

const BADGES_BY_GAME: Readonly<Record<string, readonly GameBadge[]>> = Object.freeze({
  red: KANTO_RED_BLUE,
  blue: KANTO_RED_BLUE,
  yellow: KANTO_YELLOW,
});

const NO_BADGES: readonly GameBadge[] = Object.freeze([]);

/** Medallas del juego en orden de gimnasio; vacío si el juego aún no tiene datos. */
export function getGameBadges(gameId: string): readonly GameBadge[] {
  return BADGES_BY_GAME[gameId] ?? NO_BADGES;
}

export function hasGameBadges(gameId: string): boolean {
  return getGameBadges(gameId).length > 0;
}

export function getGameBadge(gameId: string, key: string): GameBadge | undefined {
  return getGameBadges(gameId).find((badge) => badge.key === key);
}

export function isGameBadgeKey(gameId: string, key: string): boolean {
  return getGameBadge(gameId, key) !== undefined;
}

export function isValidLevelCapIncrease(percent: number): boolean {
  return Number.isInteger(percent) && percent >= 0 && percent <= MAX_LEVEL_CAP_INCREASE;
}

/**
 * Tope de nivel con el aumento configurado en el run. Si el resultado no es entero
 * se redondea hacia arriba: con +10 %, 14 pasa a 16 (15,4). Nunca supera el nivel 100.
 *
 * Usa aritmética entera para no depender de errores de coma flotante.
 */
export function calculateLevelCap(baseLevel: number, increasePercent: number): number {
  if (!Number.isInteger(baseLevel) || baseLevel < 1) {
    throw new RangeError('The base level must be a positive integer');
  }

  if (!isValidLevelCapIncrease(increasePercent)) {
    throw new RangeError(
      `The level increase must be an integer between 0 and ${MAX_LEVEL_CAP_INCREASE}`,
    );
  }

  const scaled = baseLevel * (100 + increasePercent);

  return Math.min(MAX_POKEMON_LEVEL, Math.floor((scaled + 99) / 100));
}
