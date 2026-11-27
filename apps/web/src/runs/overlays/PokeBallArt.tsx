import type { PokeBall } from '@runvista/pokemon/pokeballs';

interface PokeBallArtProps {
  ball: PokeBall;
  className?: string;
}

const OUTLINE = '#1b1b1b';

/**
 * Dibuja la Poké Ball como vector. A diferencia del sprite de 30 px,
 * se ve nítida a cualquier tamaño, algo necesario en un lienzo de 1920×1080.
 * Es una versión estilizada, no el arte oficial.
 */
export function PokeBallArt({ ball, className }: PokeBallArtProps) {
  const { top, bottom, accent } = ball.colors;

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      data-poke-ball={ball.key}
      className={className}
    >
      <path d="M4 50 A46 46 0 0 1 96 50 Z" fill={top} />
      <path d="M4 50 A46 46 0 0 0 96 50 Z" fill={bottom} />

      {accent && (
        <>
          <path
            d="M29.4 25.5 A32 32 0 0 0 19.9 39.1"
            fill="none"
            stroke={accent}
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M70.6 25.5 A32 32 0 0 1 80.1 39.1"
            fill="none"
            stroke={accent}
            strokeWidth="7"
            strokeLinecap="round"
          />
        </>
      )}

      <rect x="4" y="45" width="92" height="10" fill={OUTLINE} />

      <circle cx="50" cy="50" r="46" fill="none" stroke={OUTLINE} strokeWidth="4" />

      <circle cx="50" cy="50" r="13" fill="#f5f5f5" stroke={OUTLINE} strokeWidth="4" />
      <circle cx="50" cy="50" r="5.5" fill="#e0e0e0" stroke={OUTLINE} strokeWidth="2" />
    </svg>
  );
}
