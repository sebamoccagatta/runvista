/**
 * Medallas de gimnasio por juego.
 *
 * Una medalla se define una sola vez (región, nombre y colores). Cada juego
 * declara en qué orden se consiguen, qué líder la entrega y su tope de nivel,
 * que es lo que cambia entre versiones.
 *
 * Los juegos sin datos (los de Alola, que usan pruebas, y los Leyendas, que no
 * tienen gimnasios) devuelven una lista vacía y no ofrecen el rastreador.
 */

export type BadgeRegion =
  'kanto' | 'johto' | 'hoenn' | 'sinnoh' | 'unova' | 'kalos' | 'galar' | 'paldea';

export const BADGE_REGION_NAMES: Readonly<Record<BadgeRegion, string>> = Object.freeze({
  kanto: 'Kanto',
  johto: 'Johto',
  hoenn: 'Hoenn',
  sinnoh: 'Sinnoh',
  unova: 'Teselia',
  kalos: 'Kalos',
  galar: 'Galar',
  paldea: 'Paldea',
});

/** Colores con los que se dibuja el icono de la medalla (arte propio, no el oficial). */
export interface BadgeColors {
  primary: string;
  secondary: string;
}

export interface GameBadge {
  /** Identifica la medalla; es la misma en todos los juegos donde aparece. */
  key: string;
  region: BadgeRegion;
  /** Solo para accesibilidad: la interfaz muestra el icono, no el nombre. */
  name: string;
  leader: string;
  /** Nivel del Pokémon más alto del equipo principal del líder, sin aumento. */
  levelCap: number;
  colors: BadgeColors;
}

/** Aumento máximo del nivel de los rivales que se puede configurar, en porcentaje. */
export const MAX_LEVEL_CAP_INCREASE = 100;

const MAX_POKEMON_LEVEL = 100;

interface BadgeDefinition {
  region: BadgeRegion;
  name: string;
  colors: BadgeColors;
}

function badge(
  region: BadgeRegion,
  name: string,
  primary: string,
  secondary: string,
): BadgeDefinition {
  return { region, name, colors: { primary, secondary } };
}

const BADGE_DEFINITIONS: Readonly<Record<string, BadgeDefinition>> = Object.freeze({
  // Kanto
  'kanto-boulder': badge('kanto', 'Medalla Roca', '#9e8f7a', '#5d4b3a'),
  'kanto-cascade': badge('kanto', 'Medalla Cascada', '#4fc3f7', '#0277bd'),
  'kanto-thunder': badge('kanto', 'Medalla Trueno', '#fdd835', '#f57f17'),
  'kanto-rainbow': badge('kanto', 'Medalla Arcoíris', '#66bb6a', '#ec407a'),
  'kanto-soul': badge('kanto', 'Medalla Alma', '#f06292', '#880e4f'),
  'kanto-marsh': badge('kanto', 'Medalla Pantano', '#ffca28', '#6a1b9a'),
  'kanto-volcano': badge('kanto', 'Medalla Volcán', '#ef5350', '#b71c1c'),
  'kanto-earth': badge('kanto', 'Medalla Tierra', '#8d6e63', '#2e7d32'),

  // Johto
  'johto-zephyr': badge('johto', 'Medalla Céfiro', '#b0bec5', '#546e7a'),
  'johto-hive': badge('johto', 'Medalla Colmena', '#ffd54f', '#ef6c00'),
  'johto-plain': badge('johto', 'Medalla Planicie', '#f48fb1', '#ad1457'),
  'johto-fog': badge('johto', 'Medalla Niebla', '#ce93d8', '#4a148c'),
  'johto-storm': badge('johto', 'Medalla Tormenta', '#eceff1', '#455a64'),
  'johto-mineral': badge('johto', 'Medalla Mineral', '#cfd8dc', '#607d8b'),
  'johto-glacier': badge('johto', 'Medalla Glaciar', '#80deea', '#006064'),
  'johto-rising': badge('johto', 'Medalla Ascenso', '#ff7043', '#bf360c'),

  // Hoenn
  'hoenn-stone': badge('hoenn', 'Medalla Piedra', '#bcaaa4', '#4e342e'),
  'hoenn-knuckle': badge('hoenn', 'Medalla Puño', '#ef9a9a', '#b71c1c'),
  'hoenn-dynamo': badge('hoenn', 'Medalla Dinamo', '#fff176', '#f9a825'),
  'hoenn-heat': badge('hoenn', 'Medalla Calor', '#ff8a65', '#d84315'),
  'hoenn-balance': badge('hoenn', 'Medalla Equilibrio', '#e0e0e0', '#616161'),
  'hoenn-feather': badge('hoenn', 'Medalla Pluma', '#81d4fa', '#0277bd'),
  'hoenn-mind': badge('hoenn', 'Medalla Mente', '#ce93d8', '#6a1b9a'),
  'hoenn-rain': badge('hoenn', 'Medalla Lluvia', '#64b5f6', '#0d47a1'),

  // Sinnoh
  'sinnoh-coal': badge('sinnoh', 'Medalla Hulla', '#a1887f', '#3e2723'),
  'sinnoh-forest': badge('sinnoh', 'Medalla Bosque', '#81c784', '#1b5e20'),
  'sinnoh-cobble': badge('sinnoh', 'Medalla Adoquín', '#ffb74d', '#e65100'),
  'sinnoh-fen': badge('sinnoh', 'Medalla Ciénaga', '#4dd0e1', '#006064'),
  'sinnoh-relic': badge('sinnoh', 'Medalla Reliquia', '#ba68c8', '#4a148c'),
  'sinnoh-mine': badge('sinnoh', 'Medalla Mina', '#b0bec5', '#263238'),
  'sinnoh-icicle': badge('sinnoh', 'Medalla Carámbano', '#b3e5fc', '#01579b'),
  'sinnoh-beacon': badge('sinnoh', 'Medalla Faro', '#fff59d', '#f57f17'),

  // Teselia (Negro/Blanco y Negro 2/Blanco 2)
  'unova-trio': badge('unova', 'Medalla Trío', '#81c784', '#e53935'),
  'unova-basic': badge('unova', 'Medalla Básica', '#bdbdbd', '#424242'),
  'unova-insect': badge('unova', 'Medalla Insecto', '#aed581', '#558b2f'),
  'unova-bolt': badge('unova', 'Medalla Voltio', '#fff176', '#f9a825'),
  'unova-quake': badge('unova', 'Medalla Temblor', '#bcaaa4', '#5d4037'),
  'unova-jet': badge('unova', 'Medalla Jet', '#90caf9', '#1565c0'),
  'unova-freeze': badge('unova', 'Medalla Helada', '#e1f5fe', '#0288d1'),
  'unova-legend': badge('unova', 'Medalla Leyenda', '#ef5350', '#4a148c'),
  'unova-toxic': badge('unova', 'Medalla Tóxica', '#ba68c8', '#6a1b9a'),
  'unova-wave': badge('unova', 'Medalla Ola', '#4fc3f7', '#01579b'),

  // Kalos
  'kalos-bug': badge('kalos', 'Medalla Bicho', '#c5e1a5', '#33691e'),
  'kalos-cliff': badge('kalos', 'Medalla Acantilado', '#d7ccc8', '#6d4c41'),
  'kalos-rumble': badge('kalos', 'Medalla Estruendo', '#ffab91', '#bf360c'),
  'kalos-plant': badge('kalos', 'Medalla Planta', '#a5d6a7', '#2e7d32'),
  'kalos-voltage': badge('kalos', 'Medalla Voltaje', '#fff176', '#f57f17'),
  'kalos-fairy': badge('kalos', 'Medalla Hada', '#f8bbd0', '#ec407a'),
  'kalos-psychic': badge('kalos', 'Medalla Psíquica', '#e1bee7', '#8e24aa'),
  'kalos-iceberg': badge('kalos', 'Medalla Iceberg', '#e0f7fa', '#0097a7'),

  // Galar (Espada y Escudo se diferencian en dos gimnasios)
  'galar-grass': badge('galar', 'Medalla Planta', '#a5d6a7', '#2e7d32'),
  'galar-water': badge('galar', 'Medalla Agua', '#64b5f6', '#0d47a1'),
  'galar-fire': badge('galar', 'Medalla Fuego', '#ff8a65', '#bf360c'),
  'galar-fighting': badge('galar', 'Medalla Lucha', '#ef9a9a', '#b71c1c'),
  'galar-ghost': badge('galar', 'Medalla Fantasma', '#b39ddb', '#4527a0'),
  'galar-fairy': badge('galar', 'Medalla Hada', '#f8bbd0', '#ad1457'),
  'galar-rock': badge('galar', 'Medalla Roca', '#bcaaa4', '#4e342e'),
  'galar-ice': badge('galar', 'Medalla Hielo', '#b3e5fc', '#0277bd'),
  'galar-dark': badge('galar', 'Medalla Siniestro', '#9e9e9e', '#212121'),
  'galar-dragon': badge('galar', 'Medalla Dragón', '#7986cb', '#1a237e'),

  // Paldea
  'paldea-bug': badge('paldea', 'Medalla Bicho', '#c5e1a5', '#558b2f'),
  'paldea-grass': badge('paldea', 'Medalla Planta', '#a5d6a7', '#2e7d32'),
  'paldea-electric': badge('paldea', 'Medalla Eléctrico', '#fff176', '#f9a825'),
  'paldea-water': badge('paldea', 'Medalla Agua', '#64b5f6', '#1565c0'),
  'paldea-normal': badge('paldea', 'Medalla Normal', '#e0e0e0', '#757575'),
  'paldea-ghost': badge('paldea', 'Medalla Fantasma', '#b39ddb', '#4527a0'),
  'paldea-psychic': badge('paldea', 'Medalla Psíquico', '#f48fb1', '#ad1457'),
  'paldea-ice': badge('paldea', 'Medalla Hielo', '#b3e5fc', '#0277bd'),
});

/** Medalla, líder que la entrega y tope de nivel, en el orden en que se consiguen. */
type BadgeEntry = readonly [key: string, leader: string, levelCap: number];

function defineGame(entries: readonly BadgeEntry[]): readonly GameBadge[] {
  const seen = new Set<string>();

  return Object.freeze(
    entries.map(([key, leader, levelCap]) => {
      const definition = BADGE_DEFINITIONS[key];

      if (!definition) {
        throw new Error(`Unknown badge: ${key}`);
      }

      if (seen.has(key)) {
        throw new Error(`Badge listed twice in a game: ${key}`);
      }

      if (!Number.isInteger(levelCap) || levelCap < 1 || levelCap > MAX_POKEMON_LEVEL) {
        throw new Error(`Invalid level cap for ${key}: ${levelCap}`);
      }

      seen.add(key);

      return Object.freeze({ key, leader, levelCap, ...definition });
    }),
  );
}

const SURGE = 'Teniente Surge';

// Generación I. Nivel más alto del equipo de cada líder (Serebii).
const KANTO_RED_BLUE = defineGame([
  ['kanto-boulder', 'Brock', 14],
  ['kanto-cascade', 'Misty', 21],
  ['kanto-thunder', SURGE, 24],
  ['kanto-rainbow', 'Erika', 29],
  ['kanto-soul', 'Koga', 43],
  ['kanto-marsh', 'Sabrina', 43],
  ['kanto-volcano', 'Blaine', 47],
  ['kanto-earth', 'Giovanni', 50],
]);

const KANTO_YELLOW = defineGame([
  ['kanto-boulder', 'Brock', 12],
  ['kanto-cascade', 'Misty', 21],
  ['kanto-thunder', SURGE, 28],
  ['kanto-rainbow', 'Erika', 32],
  ['kanto-soul', 'Koga', 50],
  ['kanto-marsh', 'Sabrina', 50],
  ['kanto-volcano', 'Blaine', 54],
  ['kanto-earth', 'Giovanni', 55],
]);

// Generación II. Johto en el orden de la historia. Los gimnasios de Kanto se
// pueden hacer en cualquier orden, así que van de menor a mayor tope.
const JOHTO_GOLD_SILVER_CRYSTAL = [
  ['johto-zephyr', 'Falkner', 9],
  ['johto-hive', 'Bugsy', 16],
  ['johto-plain', 'Whitney', 20],
  ['johto-fog', 'Morty', 25],
  ['johto-storm', 'Chuck', 30],
  ['johto-mineral', 'Jasmine', 35],
  ['johto-glacier', 'Pryce', 31],
  ['johto-rising', 'Clair', 40],
] as const satisfies readonly BadgeEntry[];

const KANTO_GOLD_SILVER_CRYSTAL = [
  ['kanto-soul', 'Janine', 39],
  ['kanto-boulder', 'Brock', 44],
  ['kanto-thunder', SURGE, 45],
  ['kanto-rainbow', 'Erika', 46],
  ['kanto-cascade', 'Misty', 47],
  ['kanto-marsh', 'Sabrina', 48],
  ['kanto-volcano', 'Blaine', 50],
  ['kanto-earth', 'Blue', 58],
] as const satisfies readonly BadgeEntry[];

const JOHTO_HEARTGOLD_SOULSILVER = [
  ['johto-zephyr', 'Falkner', 13],
  ['johto-hive', 'Bugsy', 17],
  ['johto-plain', 'Whitney', 19],
  ['johto-fog', 'Morty', 25],
  ['johto-storm', 'Chuck', 31],
  ['johto-mineral', 'Jasmine', 35],
  ['johto-glacier', 'Pryce', 34],
  ['johto-rising', 'Clair', 41],
] as const satisfies readonly BadgeEntry[];

const KANTO_HEARTGOLD_SOULSILVER = [
  ['kanto-soul', 'Janine', 50],
  ['kanto-thunder', SURGE, 53],
  ['kanto-boulder', 'Brock', 54],
  ['kanto-cascade', 'Misty', 54],
  ['kanto-marsh', 'Sabrina', 55],
  ['kanto-rainbow', 'Erika', 56],
  ['kanto-volcano', 'Blaine', 59],
  ['kanto-earth', 'Blue', 60],
] as const satisfies readonly BadgeEntry[];

// Generación III.
const HOENN_RUBY_SAPPHIRE = defineGame([
  ['hoenn-stone', 'Roxanne', 15],
  ['hoenn-knuckle', 'Brawly', 18],
  ['hoenn-dynamo', 'Wattson', 23],
  ['hoenn-heat', 'Flannery', 28],
  ['hoenn-balance', 'Norman', 31],
  ['hoenn-feather', 'Winona', 33],
  ['hoenn-mind', 'Tate y Liza', 42],
  ['hoenn-rain', 'Wallace', 43],
]);

const HOENN_EMERALD = defineGame([
  ['hoenn-stone', 'Roxanne', 15],
  ['hoenn-knuckle', 'Brawly', 19],
  ['hoenn-dynamo', 'Wattson', 24],
  ['hoenn-heat', 'Flannery', 29],
  ['hoenn-balance', 'Norman', 31],
  ['hoenn-feather', 'Winona', 33],
  ['hoenn-mind', 'Tate y Liza', 42],
  ['hoenn-rain', 'Juan', 46],
]);

// Generación IV.
const SINNOH_DIAMOND_PEARL = defineGame([
  ['sinnoh-coal', 'Roark', 14],
  ['sinnoh-forest', 'Gardenia', 22],
  ['sinnoh-cobble', 'Maylene', 30],
  ['sinnoh-fen', 'Crasher Wake', 30],
  ['sinnoh-relic', 'Fantina', 36],
  ['sinnoh-mine', 'Byron', 39],
  ['sinnoh-icicle', 'Candice', 42],
  ['sinnoh-beacon', 'Volkner', 49],
]);

const SINNOH_PLATINUM = defineGame([
  ['sinnoh-coal', 'Roark', 14],
  ['sinnoh-forest', 'Gardenia', 22],
  ['sinnoh-relic', 'Fantina', 26],
  ['sinnoh-cobble', 'Maylene', 32],
  ['sinnoh-fen', 'Crasher Wake', 37],
  ['sinnoh-mine', 'Byron', 41],
  ['sinnoh-icicle', 'Candice', 44],
  ['sinnoh-beacon', 'Volkner', 50],
]);

// Generación V. En Negro/Blanco la primera medalla la da uno de tres líderes
// según el inicial, y la última, Drayden o Iris según la versión.
const UNOVA_BLACK_WHITE = defineGame([
  ['unova-trio', 'Cilan / Chili / Cress', 14],
  ['unova-basic', 'Lenora', 20],
  ['unova-insect', 'Burgh', 23],
  ['unova-bolt', 'Elesa', 27],
  ['unova-quake', 'Clay', 31],
  ['unova-jet', 'Skyla', 35],
  ['unova-freeze', 'Brycen', 39],
  ['unova-legend', 'Drayden / Iris', 43],
]);

// Negro 2/Blanco 2, modo Normal. El modo Desafío sube cada tope unos niveles.
const UNOVA_BLACK2_WHITE2 = defineGame([
  ['unova-basic', 'Cheren', 13],
  ['unova-toxic', 'Roxie', 18],
  ['unova-insect', 'Burgh', 24],
  ['unova-bolt', 'Elesa', 30],
  ['unova-quake', 'Clay', 33],
  ['unova-jet', 'Skyla', 39],
  ['unova-legend', 'Drayden', 48],
  ['unova-wave', 'Marlon', 51],
]);

// Generación VI.
const KALOS_X_Y = defineGame([
  ['kalos-bug', 'Viola', 12],
  ['kalos-cliff', 'Grant', 25],
  ['kalos-rumble', 'Korrina', 32],
  ['kalos-plant', 'Ramos', 34],
  ['kalos-voltage', 'Clemont', 37],
  ['kalos-fairy', 'Valerie', 42],
  ['kalos-psychic', 'Olympia', 48],
  ['kalos-iceberg', 'Wulfric', 59],
]);

const HOENN_OMEGA_RUBY_ALPHA_SAPPHIRE = defineGame([
  ['hoenn-stone', 'Roxanne', 14],
  ['hoenn-knuckle', 'Brawly', 16],
  ['hoenn-dynamo', 'Wattson', 21],
  ['hoenn-heat', 'Flannery', 28],
  ['hoenn-balance', 'Norman', 30],
  ['hoenn-feather', 'Winona', 35],
  ['hoenn-mind', 'Tate y Liza', 45],
  ['hoenn-rain', 'Wallace', 46],
]);

// Generación VII (Let's Go) y VIII.
const KANTO_LETS_GO = defineGame([
  ['kanto-boulder', 'Brock', 12],
  ['kanto-cascade', 'Misty', 19],
  ['kanto-thunder', SURGE, 26],
  ['kanto-rainbow', 'Erika', 34],
  ['kanto-soul', 'Koga', 44],
  ['kanto-marsh', 'Sabrina', 44],
  ['kanto-volcano', 'Blaine', 48],
  ['kanto-earth', 'Giovanni', 50],
]);

const GALAR_SWORD = defineGame([
  ['galar-grass', 'Milo', 20],
  ['galar-water', 'Nessa', 24],
  ['galar-fire', 'Kabu', 27],
  ['galar-fighting', 'Bea', 36],
  ['galar-fairy', 'Opal', 38],
  ['galar-rock', 'Gordie', 42],
  ['galar-dark', 'Piers', 46],
  ['galar-dragon', 'Raihan', 48],
]);

const GALAR_SHIELD = defineGame([
  ['galar-grass', 'Milo', 20],
  ['galar-water', 'Nessa', 24],
  ['galar-fire', 'Kabu', 27],
  ['galar-ghost', 'Allister', 36],
  ['galar-fairy', 'Opal', 38],
  ['galar-ice', 'Melony', 42],
  ['galar-dark', 'Piers', 46],
  ['galar-dragon', 'Raihan', 48],
]);

// Generación IX. Los gimnasios se pueden hacer en cualquier orden; van de
// menor a mayor tope, que es el orden recomendado.
const PALDEA_SCARLET_VIOLET = defineGame([
  ['paldea-bug', 'Katy', 15],
  ['paldea-grass', 'Brassius', 17],
  ['paldea-electric', 'Iono', 24],
  ['paldea-water', 'Kofu', 30],
  ['paldea-normal', 'Larry', 36],
  ['paldea-ghost', 'Ryme', 42],
  ['paldea-psychic', 'Tulip', 45],
  ['paldea-ice', 'Grusha', 48],
]);

const JOHTO_AND_KANTO_GSC = defineGame([
  ...JOHTO_GOLD_SILVER_CRYSTAL,
  ...KANTO_GOLD_SILVER_CRYSTAL,
]);

const JOHTO_AND_KANTO_HGSS = defineGame([
  ...JOHTO_HEARTGOLD_SOULSILVER,
  ...KANTO_HEARTGOLD_SOULSILVER,
]);

const BADGES_BY_GAME: Readonly<Record<string, readonly GameBadge[]>> = Object.freeze({
  // Generación I
  red: KANTO_RED_BLUE,
  blue: KANTO_RED_BLUE,
  yellow: KANTO_YELLOW,

  // Generación II
  gold: JOHTO_AND_KANTO_GSC,
  silver: JOHTO_AND_KANTO_GSC,
  crystal: JOHTO_AND_KANTO_GSC,

  // Generación III
  ruby: HOENN_RUBY_SAPPHIRE,
  sapphire: HOENN_RUBY_SAPPHIRE,
  emerald: HOENN_EMERALD,
  firered: KANTO_RED_BLUE,
  leafgreen: KANTO_RED_BLUE,

  // Generación IV
  diamond: SINNOH_DIAMOND_PEARL,
  pearl: SINNOH_DIAMOND_PEARL,
  platinum: SINNOH_PLATINUM,
  heartgold: JOHTO_AND_KANTO_HGSS,
  soulsilver: JOHTO_AND_KANTO_HGSS,

  // Generación V
  black: UNOVA_BLACK_WHITE,
  white: UNOVA_BLACK_WHITE,
  'black-2': UNOVA_BLACK2_WHITE2,
  'white-2': UNOVA_BLACK2_WHITE2,

  // Generación VI
  x: KALOS_X_Y,
  y: KALOS_X_Y,
  'omega-ruby': HOENN_OMEGA_RUBY_ALPHA_SAPPHIRE,
  'alpha-sapphire': HOENN_OMEGA_RUBY_ALPHA_SAPPHIRE,

  // Generación VII: solo Let's Go tiene gimnasios.
  'lets-go-pikachu': KANTO_LETS_GO,
  'lets-go-eevee': KANTO_LETS_GO,

  // Generación VIII: los remakes de Sinnoh repiten los topes de Diamante/Perla.
  sword: GALAR_SWORD,
  shield: GALAR_SHIELD,
  'brilliant-diamond': SINNOH_DIAMOND_PEARL,
  'shining-pearl': SINNOH_DIAMOND_PEARL,

  // Generación IX
  scarlet: PALDEA_SCARLET_VIOLET,
  violet: PALDEA_SCARLET_VIOLET,
});

const NO_BADGES: readonly GameBadge[] = Object.freeze([]);

/** Medallas del juego en orden de gimnasio; vacío si el juego no tiene datos. */
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
 * Tope de nivel con el aumento configurado en el run, redondeado al entero más
 * cercano (con .5 hacia arriba): con +10 %, 14 pasa a 15 (15,4). Nunca supera el nivel 100.
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

  return Math.min(MAX_POKEMON_LEVEL, Math.floor((scaled + 50) / 100));
}
