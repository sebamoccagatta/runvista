import type { ReactNode } from 'react';

import {
  FONT_FAMILIES,
  OVERLAY_STYLE_LIMITS,
  type FontFamily,
  type OverlayStyle,
} from '@runvista/overlay-engine';

import { inputStyles } from '../types';

export type StyleGroup = keyof OverlayStyle;

export interface OverlayStyleControlsProps {
  /** Prefijo para los ids de los campos: evita choques entre varios paneles. */
  idPrefix: string;
  /** Valores que se muestran: el estilo común o el efectivo de un espacio. */
  style: OverlayStyle;
  onChange: <G extends StyleGroup>(group: G, changes: Partial<OverlayStyle[G]>) => void;
  /** Grupos que este espacio ajusta por su cuenta. Muestra "Restablecer" en esos grupos. */
  overridden?: Partial<Record<StyleGroup, boolean>>;
  onResetGroup?: (group: StyleGroup) => void;
}

const FONT_LABELS: Record<FontFamily, string> = {
  sans: 'Sans (Inter)',
  serif: 'Serif',
  mono: 'Monoespaciada',
  rounded: 'Redondeada',
};

function percent(value: number): string {
  return `${Math.round(value * 100)} %`;
}

interface ColorFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ id, label, value, onChange }: ColorFieldProps) {
  return (
    <label htmlFor={id} className="flex min-h-10 items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input
        id={id}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-12 cursor-pointer rounded border border-white/15 bg-canvas"
      />
    </label>
  );
}

interface RangeFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}

function RangeField({ id, label, value, min, max, step, display, onChange }: RangeFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <label htmlFor={id}>{label}</label>
        <span className="text-xs text-text-secondary">{display}</span>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const next = event.target.valueAsNumber;

          if (Number.isFinite(next)) {
            // Los pasos de 0.05 dejan restos de coma flotante: se guardan con 2 decimales.
            onChange(Math.round(next * 100) / 100);
          }
        }}
        className="w-full accent-accent"
      />
    </div>
  );
}

interface GroupProps {
  title: string;
  group: StyleGroup;
  overridden: boolean;
  onReset: ((group: StyleGroup) => void) | undefined;
  children: ReactNode;
}

function Group({ title, group, overridden, onReset, children }: GroupProps) {
  return (
    <fieldset className="space-y-3 border-t border-white/10 pt-4">
      <div className="flex items-center justify-between gap-3">
        <legend className="text-sm font-bold">{title}</legend>

        {overridden && onReset && (
          <button
            type="button"
            onClick={() => onReset(group)}
            aria-label={`Restablecer ${title.toLowerCase()}`}
            className="text-xs font-semibold text-accent hover:underline"
          >
            Restablecer
          </button>
        )}
      </div>

      {children}
    </fieldset>
  );
}

export function OverlayStyleControls({
  idPrefix,
  style,
  onChange,
  overridden = {},
  onResetGroup,
}: OverlayStyleControlsProps) {
  const { card, label, ball } = style;
  const limits = OVERLAY_STYLE_LIMITS;

  return (
    <div className="space-y-4">
      <Group
        title="Tarjeta"
        group="card"
        overridden={overridden.card === true}
        onReset={onResetGroup}
      >
        <ColorField
          id={`${idPrefix}-card-background`}
          label="Color de fondo"
          value={card.background}
          onChange={(value) => onChange('card', { background: value })}
        />

        <RangeField
          id={`${idPrefix}-card-opacity`}
          label="Opacidad del fondo"
          value={card.backgroundOpacity}
          min={limits.opacity.min}
          max={limits.opacity.max}
          step={0.05}
          display={percent(card.backgroundOpacity)}
          onChange={(value) => onChange('card', { backgroundOpacity: value })}
        />

        <RangeField
          id={`${idPrefix}-card-border-width`}
          label="Grosor del borde"
          value={card.borderWidth}
          min={limits.borderWidth.min}
          max={limits.borderWidth.max}
          step={1}
          display={`${card.borderWidth} px`}
          onChange={(value) => onChange('card', { borderWidth: value })}
        />

        <ColorField
          id={`${idPrefix}-card-border-color`}
          label="Color del borde"
          value={card.borderColor}
          onChange={(value) => onChange('card', { borderColor: value })}
        />

        <RangeField
          id={`${idPrefix}-card-radius`}
          label="Esquinas redondeadas"
          value={card.radius}
          min={limits.radius.min}
          max={limits.radius.max}
          step={1}
          display={`${card.radius} px`}
          onChange={(value) => onChange('card', { radius: value })}
        />
      </Group>

      <Group
        title="Texto"
        group="label"
        overridden={overridden.label === true}
        onReset={onResetGroup}
      >
        <ColorField
          id={`${idPrefix}-label-color`}
          label="Color del texto"
          value={label.color}
          onChange={(value) => onChange('label', { color: value })}
        />

        <RangeField
          id={`${idPrefix}-label-size`}
          label="Tamaño del texto"
          value={label.fontSize}
          min={limits.fontSize.min}
          max={limits.fontSize.max}
          step={1}
          display={`${label.fontSize} px`}
          onChange={(value) => onChange('label', { fontSize: value })}
        />

        <label
          htmlFor={`${idPrefix}-label-font`}
          className="flex min-h-10 items-center justify-between gap-3 text-sm"
        >
          <span>Tipografía</span>

          <select
            id={`${idPrefix}-label-font`}
            value={label.fontFamily}
            onChange={(event) =>
              onChange('label', { fontFamily: event.target.value as FontFamily })
            }
            className={`${inputStyles} !w-auto !px-3 !py-2`}
          >
            {FONT_FAMILIES.map((family) => (
              <option key={family} value={family}>
                {FONT_LABELS[family]}
              </option>
            ))}
          </select>
        </label>

        <ColorField
          id={`${idPrefix}-label-background`}
          label="Color del fondo del texto"
          value={label.background}
          onChange={(value) => onChange('label', { background: value })}
        />

        <RangeField
          id={`${idPrefix}-label-opacity`}
          label="Opacidad del fondo del texto"
          value={label.backgroundOpacity}
          min={limits.opacity.min}
          max={limits.opacity.max}
          step={0.05}
          display={percent(label.backgroundOpacity)}
          onChange={(value) => onChange('label', { backgroundOpacity: value })}
        />

        <label
          htmlFor={`${idPrefix}-label-shadow`}
          className="flex min-h-10 items-center justify-between gap-3 text-sm"
        >
          <span>Sombra del texto</span>

          <input
            id={`${idPrefix}-label-shadow`}
            type="checkbox"
            checked={label.shadow}
            onChange={(event) => onChange('label', { shadow: event.target.checked })}
            className="h-4 w-4 accent-accent"
          />
        </label>
      </Group>

      <Group
        title="Poké Ball"
        group="ball"
        overridden={overridden.ball === true}
        onReset={onResetGroup}
      >
        <RangeField
          id={`${idPrefix}-ball-opacity`}
          label="Opacidad de la ball"
          value={ball.opacity}
          min={limits.opacity.min}
          max={limits.opacity.max}
          step={0.05}
          display={percent(ball.opacity)}
          onChange={(value) => onChange('ball', { opacity: value })}
        />

        <RangeField
          id={`${idPrefix}-ball-scale`}
          label="Tamaño de la ball"
          value={ball.scale}
          min={limits.ballScale.min}
          max={limits.ballScale.max}
          step={0.05}
          display={percent(ball.scale)}
          onChange={(value) => onChange('ball', { scale: value })}
        />
      </Group>
    </div>
  );
}
