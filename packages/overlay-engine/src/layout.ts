import { hasOnlyKeys, isInteger, isRecord } from './guards.js';
import {
  cloneOverlayStyle,
  DEFAULT_OVERLAY_STYLE,
  isValidOverlayStyle,
  isValidStylePatch,
  type OverlayStyle,
  type OverlayStylePatch,
} from './styles.js';

export const OVERLAY_CANVAS_WIDTH = 1920;
export const OVERLAY_CANVAS_HEIGHT = 1080;

export const OVERLAY_SLOT_COUNT = 6;

export const OVERLAY_ELEMENT_SIZE = Object.freeze({ min: 80, max: 600 });

export interface OverlayElementGeometry {
  slot: number;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  showNickname: boolean;
  showSpecies: boolean;
  showLevel: boolean;
}

export interface OverlayElement extends OverlayElementGeometry {
  /** Ajuste opcional de este espacio. Sin él se usa el estilo común. */
  style?: OverlayStylePatch;
}

export interface OverlayLayoutV1 {
  version: 1;
  canvas: { width: typeof OVERLAY_CANVAS_WIDTH; height: typeof OVERLAY_CANVAS_HEIGHT };
  elements: OverlayElementGeometry[];
}

export interface OverlayLayout {
  version: 2;
  canvas: { width: typeof OVERLAY_CANVAS_WIDTH; height: typeof OVERLAY_CANVAS_HEIGHT };
  /** Estilo común para los seis espacios. */
  style: OverlayStyle;
  animations: { enabled: boolean };
  elements: OverlayElement[];
}

export function createDefaultOverlayLayout(): OverlayLayout {
  return {
    version: 2,
    canvas: {
      width: OVERLAY_CANVAS_WIDTH,
      height: OVERLAY_CANVAS_HEIGHT,
    },
    style: cloneOverlayStyle(DEFAULT_OVERLAY_STYLE),
    animations: { enabled: true },
    elements: Array.from({ length: OVERLAY_SLOT_COUNT }, (_, index) => ({
      slot: index + 1,
      x: 120 + index * 280,
      y: 820,
      width: 220,
      height: 190,
      visible: true,
      showNickname: true,
      showSpecies: false,
      showLevel: true,
    })),
  };
}

const GEOMETRY_KEYS = [
  'slot',
  'x',
  'y',
  'width',
  'height',
  'visible',
  'showNickname',
  'showSpecies',
  'showLevel',
] as const;

function isValidGeometry(element: unknown, allowStyle: boolean): element is OverlayElementGeometry {
  if (!isRecord(element)) {
    return false;
  }

  // Sin propiedades desconocidas. `style` solo existe a partir de la versión 2.
  if (!hasOnlyKeys(element, allowStyle ? [...GEOMETRY_KEYS, 'style'] : GEOMETRY_KEYS)) {
    return false;
  }

  const { slot, x, y, width, height, visible, showNickname, showSpecies, showLevel } = element;

  if (
    !isInteger(slot) ||
    !isInteger(x) ||
    !isInteger(y) ||
    !isInteger(width) ||
    !isInteger(height)
  ) {
    return false;
  }

  const { min, max } = OVERLAY_ELEMENT_SIZE;

  return (
    slot >= 1 &&
    slot <= OVERLAY_SLOT_COUNT &&
    x >= 0 &&
    y >= 0 &&
    width >= min &&
    width <= max &&
    height >= min &&
    height <= max &&
    x + width <= OVERLAY_CANVAS_WIDTH &&
    y + height <= OVERLAY_CANVAS_HEIGHT &&
    typeof visible === 'boolean' &&
    typeof showNickname === 'boolean' &&
    typeof showSpecies === 'boolean' &&
    typeof showLevel === 'boolean'
  );
}

/** Seis espacios, slots únicos del 1 al 6 y geometría dentro del lienzo. */
function areElementsValid(
  elements: unknown,
  allowStyle: boolean,
): elements is OverlayElementGeometry[] {
  if (!Array.isArray(elements) || elements.length !== OVERLAY_SLOT_COUNT) {
    return false;
  }

  if (!elements.every((element) => isValidGeometry(element, allowStyle))) {
    return false;
  }

  return new Set(elements.map((element) => element.slot)).size === OVERLAY_SLOT_COUNT;
}

function isCanvasValid(canvas: unknown): boolean {
  return (
    isRecord(canvas) &&
    hasOnlyKeys(canvas, ['width', 'height']) &&
    canvas.width === OVERLAY_CANVAS_WIDTH &&
    canvas.height === OVERLAY_CANVAS_HEIGHT
  );
}

function copyGeometry(element: OverlayElementGeometry): OverlayElementGeometry {
  return {
    slot: element.slot,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    visible: element.visible,
    showNickname: element.showNickname,
    showSpecies: element.showSpecies,
    showLevel: element.showLevel,
  };
}

function upgradeV1(value: Record<string, unknown>): OverlayLayout | null {
  if (
    !hasOnlyKeys(value, ['version', 'canvas', 'elements']) ||
    !areElementsValid(value.elements, false)
  ) {
    return null;
  }

  return {
    version: 2,
    canvas: { width: OVERLAY_CANVAS_WIDTH, height: OVERLAY_CANVAS_HEIGHT },
    style: cloneOverlayStyle(DEFAULT_OVERLAY_STYLE),
    animations: { enabled: true },
    elements: value.elements.map(copyGeometry),
  };
}

function upgradeV2(value: Record<string, unknown>): OverlayLayout | null {
  const { style, animations, elements } = value;

  if (!hasOnlyKeys(value, ['version', 'canvas', 'style', 'animations', 'elements'])) {
    return null;
  }

  if (
    !isValidOverlayStyle(style) ||
    !isRecord(animations) ||
    !hasOnlyKeys(animations, ['enabled']) ||
    typeof animations.enabled !== 'boolean'
  ) {
    return null;
  }

  if (!areElementsValid(elements, true)) {
    return null;
  }

  const withStyles = elements as (OverlayElementGeometry & { style?: unknown })[];

  if (
    !withStyles.every((element) => element.style === undefined || isValidStylePatch(element.style))
  ) {
    return null;
  }

  return {
    version: 2,
    canvas: { width: OVERLAY_CANVAS_WIDTH, height: OVERLAY_CANVAS_HEIGHT },
    style,
    animations: { enabled: animations.enabled },
    elements: withStyles.map((element) => ({
      ...copyGeometry(element),
      ...(element.style !== undefined ? { style: element.style as OverlayStylePatch } : {}),
    })),
  };
}

/**
 * Convierte cualquier layout admitido a la versión 2. Los layouts v1 reciben el
 * estilo por defecto. Devuelve null si el valor no es un layout válido.
 */
export function upgradeLayout(value: unknown): OverlayLayout | null {
  if (!isRecord(value) || !isCanvasValid(value.canvas)) {
    return null;
  }

  if (value.version === 1) {
    return upgradeV1(value);
  }

  if (value.version === 2) {
    return upgradeV2(value);
  }

  return null;
}

/**
 * Estilo efectivo de un espacio: el estilo común con el ajuste del espacio
 * encima, grupo por grupo (card, label, ball).
 */
export function resolveElementStyle(layout: OverlayLayout, element: OverlayElement): OverlayStyle {
  const patch = element.style ?? {};

  return {
    card: { ...layout.style.card, ...patch.card },
    label: { ...layout.style.label, ...patch.label },
    ball: { ...layout.style.ball, ...patch.ball },
  };
}
