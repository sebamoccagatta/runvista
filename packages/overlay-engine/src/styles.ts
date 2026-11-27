import { hasOnlyKeys, isRecord } from './guards.js';

export const FONT_FAMILIES = ['sans', 'serif', 'mono', 'rounded'] as const;

export type FontFamily = (typeof FONT_FAMILIES)[number];

/**
 * Pilas de fuentes del sistema. Ninguna fuente se descarga: depende de lo
 * instalado en el equipo del streamer, por eso solo hay familias genéricas.
 */
export const FONT_FAMILY_STACKS: Readonly<Record<FontFamily, string>> = Object.freeze({
  // Igual que --font-sans de la app, para que el estilo por defecto no cambie la fuente.
  sans: 'Inter, system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "Cascadia Code", Consolas, monospace',
  rounded: '"Varela Round", "Nunito", ui-sans-serif, system-ui, sans-serif',
});

export const OVERLAY_STYLE_LIMITS = Object.freeze({
  fontSize: { min: 8, max: 120 },
  opacity: { min: 0, max: 1 },
  radius: { min: 0, max: 64 },
  borderWidth: { min: 0, max: 16 },
  ballScale: { min: 0.5, max: 1.5 },
});

export interface CardStyle {
  background: string;
  backgroundOpacity: number;
  borderWidth: number;
  borderColor: string;
  radius: number;
}

export interface LabelStyle {
  background: string;
  backgroundOpacity: number;
  color: string;
  fontSize: number;
  fontFamily: FontFamily;
  shadow: boolean;
}

export interface BallStyle {
  opacity: number;
  scale: number;
}

export interface OverlayStyle {
  card: CardStyle;
  label: LabelStyle;
  ball: BallStyle;
}

/** Ajuste parcial de un espacio: solo lo que el streamer cambió. */
export interface OverlayStylePatch {
  card?: Partial<CardStyle>;
  label?: Partial<LabelStyle>;
  ball?: Partial<BallStyle>;
}

/**
 * Valores que reproducen el aspecto de la versión 1: tarjeta sin fondo,
 * etiqueta negra al 65 % con texto blanco de 36 px, y la ball al 85 %.
 */
export const DEFAULT_OVERLAY_STYLE: OverlayStyle = Object.freeze({
  card: Object.freeze({
    background: '#000000',
    backgroundOpacity: 0,
    borderWidth: 0,
    borderColor: '#ffffff',
    radius: 0,
  }),
  label: Object.freeze({
    background: '#000000',
    backgroundOpacity: 0.65,
    color: '#ffffff',
    fontSize: 36,
    fontFamily: 'sans',
    shadow: true,
  }),
  ball: Object.freeze({
    opacity: 0.85,
    scale: 1.15,
  }),
});

/**
 * Copia profunda del estilo. Los layouts reciben una copia propia para que
 * cambiarlos no toque el estilo por defecto compartido, que está congelado.
 */
export function cloneOverlayStyle(style: OverlayStyle): OverlayStyle {
  return {
    card: { ...style.card },
    label: { ...style.label },
    ball: { ...style.ball },
  };
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

/**
 * Convierte #RRGGBB y una opacidad en un color CSS rgba(). Si el valor no es un
 * color válido devuelve `transparent`: nunca se inserta texto arbitrario en CSS.
 */
export function hexToRgba(hex: string, alpha: number): string {
  if (!isHexColor(hex)) {
    return 'transparent';
  }

  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * Tamaño de la línea secundaria (especie y nivel) derivado del nombre.
 * Con el valor por defecto de 36 px da 24 px, como en la versión 1.
 */
export function getDetailFontSize(fontSize: number): number {
  return Math.round((fontSize * 2) / 3);
}

function isInRange(value: unknown, range: { min: number; max: number }): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && value >= range.min && value <= range.max
  );
}

const CARD_KEYS = ['background', 'backgroundOpacity', 'borderWidth', 'borderColor', 'radius'];
const LABEL_KEYS = ['background', 'backgroundOpacity', 'color', 'fontSize', 'fontFamily', 'shadow'];
const BALL_KEYS = ['opacity', 'scale'];

function isCardField(key: string, value: unknown): boolean {
  switch (key) {
    case 'background':
    case 'borderColor':
      return isHexColor(value);
    case 'backgroundOpacity':
      return isInRange(value, OVERLAY_STYLE_LIMITS.opacity);
    case 'borderWidth':
      return isInRange(value, OVERLAY_STYLE_LIMITS.borderWidth);
    case 'radius':
      return isInRange(value, OVERLAY_STYLE_LIMITS.radius);
    default:
      return false;
  }
}

function isLabelField(key: string, value: unknown): boolean {
  switch (key) {
    case 'background':
    case 'color':
      return isHexColor(value);
    case 'backgroundOpacity':
      return isInRange(value, OVERLAY_STYLE_LIMITS.opacity);
    case 'fontSize':
      return isInRange(value, OVERLAY_STYLE_LIMITS.fontSize);
    case 'fontFamily':
      return FONT_FAMILIES.some((family) => family === value);
    case 'shadow':
      return typeof value === 'boolean';
    default:
      return false;
  }
}

function isBallField(key: string, value: unknown): boolean {
  switch (key) {
    case 'opacity':
      return isInRange(value, OVERLAY_STYLE_LIMITS.opacity);
    case 'scale':
      return isInRange(value, OVERLAY_STYLE_LIMITS.ballScale);
    default:
      return false;
  }
}

function isGroupValid(
  value: unknown,
  keys: readonly string[],
  isField: (key: string, value: unknown) => boolean,
  requireAll: boolean,
): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, keys)) {
    return false;
  }

  if (requireAll && !keys.every((key) => key in value)) {
    return false;
  }

  return Object.entries(value).every(([key, field]) => isField(key, field));
}

export function isValidOverlayStyle(value: unknown): value is OverlayStyle {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['card', 'label', 'ball']) &&
    isGroupValid(value.card, CARD_KEYS, isCardField, true) &&
    isGroupValid(value.label, LABEL_KEYS, isLabelField, true) &&
    isGroupValid(value.ball, BALL_KEYS, isBallField, true)
  );
}

export function isValidStylePatch(value: unknown): value is OverlayStylePatch {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['card', 'label', 'ball']) &&
    (value.card === undefined || isGroupValid(value.card, CARD_KEYS, isCardField, false)) &&
    (value.label === undefined || isGroupValid(value.label, LABEL_KEYS, isLabelField, false)) &&
    (value.ball === undefined || isGroupValid(value.ball, BALL_KEYS, isBallField, false))
  );
}
