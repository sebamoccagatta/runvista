import type { BadgeColors } from '@runvista/pokemon/badges';

interface BadgeIconProps {
  colors: BadgeColors;
  obtained: boolean;
  className?: string;
}

const OUTLINE = '#1b1b1b';

/**
 * Icono propio de una medalla: un escudo con los colores del gimnasio.
 * No es el arte oficial; se muestra solo el icono, así que el nombre va en
 * el `aria-label` del control que lo contiene.
 */
export function BadgeIcon({ colors, obtained, className }: BadgeIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      data-badge-obtained={obtained}
      className={className}
      style={{ filter: obtained ? undefined : 'grayscale(1) opacity(0.35)' }}
    >
      <path
        d="M50 6 L88 18 L88 52 C88 74 72 88 50 96 C28 88 12 74 12 52 L12 18 Z"
        fill={colors.primary}
        stroke={OUTLINE}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M50 22 L74 30 L74 52 C74 66 64 75 50 81 C36 75 26 66 26 52 L26 30 Z"
        fill={colors.secondary}
      />
      <circle cx="50" cy="50" r="7" fill="#f5f5f5" stroke={OUTLINE} strokeWidth="2.5" />
    </svg>
  );
}
