import { useEffect, useState } from 'react';

import { BADGE_REGION_NAMES, type BadgeRegion } from '@runvista/pokemon/badges';
import { Card } from '@runvista/ui';

import { RunApiError } from '../api/runs.api';
import { secondaryButton } from '../types';

import { getRunBadges, setRunBadge, type RunBadge, type RunBadgesState } from './badges.api';
import { BadgeIcon } from './BadgeIcon';
import { isTeamOverCap } from './team-level';

interface RunBadgesPanelProps {
  runId: string;
  /**
   * Nivel más alto del equipo activo. Lo entrega la página con los datos del panel
   * de Pokémon, así la advertencia sigue los cambios sin recargar. Sin valor, no avisa.
   */
  highestTeamLevel?: number | null;
}

type LoadState = 'loading' | 'ready' | 'guest' | 'error';

function describeBadge(badge: RunBadge): string {
  return `${badge.name}, líder ${badge.leader}, tope Nv. ${badge.levelCap}`;
}

interface RegionGroup {
  region: string;
  label: string;
  badges: RunBadge[];
}

/** Agrupa por región conservando el orden en que llegan las medallas. */
function groupByRegion(badges: readonly RunBadge[]): RegionGroup[] {
  const groups: RegionGroup[] = [];

  for (const badge of badges) {
    const last = groups.at(-1);

    if (last?.region === badge.region) {
      last.badges.push(badge);
    } else {
      const label = BADGE_REGION_NAMES[badge.region as BadgeRegion] ?? badge.region;

      groups.push({ region: badge.region, label, badges: [badge] });
    }
  }

  return groups;
}

export function RunBadgesPanel({ runId, highestTeamLevel = null }: RunBadgesPanelProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [state, setState] = useState<RunBadgesState | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getRunBadges(runId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;

        setState(result);
        setError(null);
        setLoadState('ready');
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;

        setLoadState(cause instanceof RunApiError && cause.status === 401 ? 'guest' : 'error');
      });

    return () => controller.abort();
  }, [runId, retryCount]);

  async function toggle(badge: RunBadge) {
    if (pending.has(badge.key) || !state?.configured) return;

    const next = !badge.obtained;

    // Marcamos al instante y revertimos si el servidor no lo acepta.
    setState((current) =>
      current?.configured
        ? {
            ...current,
            badges: current.badges.map((item) =>
              item.key === badge.key ? { ...item, obtained: next } : item,
            ),
          }
        : current,
    );
    setPending((current) => new Set(current).add(badge.key));
    setError(null);

    try {
      const result = await setRunBadge(runId, badge.key, next);

      setState((current) =>
        current?.configured
          ? {
              ...current,
              badges: current.badges.map((item) =>
                item.key === badge.key
                  ? { ...item, obtained: next, obtainedAt: result.obtainedAt }
                  : item,
              ),
            }
          : current,
      );
    } catch (cause) {
      setState((current) =>
        current?.configured
          ? {
              ...current,
              badges: current.badges.map((item) =>
                item.key === badge.key ? { ...item, obtained: badge.obtained } : item,
              ),
            }
          : current,
      );

      setError(
        cause instanceof RunApiError && cause.status === 401
          ? 'Tu sesión venció. Iniciá sesión nuevamente.'
          : 'No pudimos guardar la medalla. Intentá nuevamente.',
      );
    } finally {
      setPending((current) => {
        const copy = new Set(current);
        copy.delete(badge.key);
        return copy;
      });
    }
  }

  const badges = state?.configured ? state.badges : [];
  const nextBadge = badges.find((badge) => !badge.obtained);
  const regionCount = groupByRegion(badges).length;

  return (
    <section aria-labelledby="badges-heading">
      <Card className="p-6 sm:p-8">
        <div className="mb-6">
          <h3 id="badges-heading" className="text-xl font-bold">
            Medallas
          </h3>

          <p className="mt-2 text-sm text-text-secondary">
            Marcá las medallas que consigas. Cada una muestra el tope de nivel de su líder.
          </p>
        </div>

        {loadState === 'loading' && (
          <p role="status" className="text-sm text-text-secondary">
            Cargando medallas...
          </p>
        )}

        {loadState === 'guest' && (
          <p className="text-sm text-text-secondary">
            Necesitás iniciar sesión para ver las medallas.
          </p>
        )}

        {loadState === 'error' && (
          <div className="space-y-4">
            <p role="alert" className="text-sm text-red-300">
              No pudimos cargar las medallas.
            </p>

            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                setLoadState('loading');
                setRetryCount((count) => count + 1);
              }}
            >
              Reintentar
            </button>
          </div>
        )}

        {loadState === 'ready' && state && !state.configured && (
          <p className="text-sm text-text-secondary">
            Elegí el juego de la partida en la configuración para seguir sus medallas.
          </p>
        )}

        {loadState === 'ready' && state?.configured && badges.length === 0 && (
          <p className="text-sm text-text-secondary">
            Este juego todavía no tiene medallas cargadas.
          </p>
        )}

        {loadState === 'ready' && state?.configured && badges.length > 0 && (
          <div className="space-y-5">
            <p className="text-sm text-text-secondary">
              {nextBadge
                ? `Próximo tope: Nv. ${nextBadge.levelCap} (líder ${nextBadge.leader}).`
                : 'Todas las medallas de este juego están marcadas.'}
            </p>

            {nextBadge && isTeamOverCap(highestTeamLevel, nextBadge.levelCap) && (
              <p role="status" className="text-sm font-semibold text-amber-300">
                Tu equipo llega al Nv. {highestTeamLevel}, por encima del tope de {nextBadge.leader}{' '}
                (Nv. {nextBadge.levelCap}).
              </p>
            )}

            {groupByRegion(badges).map((group) => (
              <div key={group.region} className="space-y-3">
                {/* Solo hace falta el título cuando el juego tiene más de una región. */}
                {regionCount > 1 && (
                  <h4 className="text-sm font-semibold text-text-secondary">{group.label}</h4>
                )}

                <ul className="grid grid-cols-4 gap-3 sm:grid-cols-8">
                  {group.badges.map((badge) => (
                    <li key={badge.key}>
                      <button
                        type="button"
                        aria-pressed={badge.obtained}
                        aria-label={describeBadge(badge)}
                        title={describeBadge(badge)}
                        disabled={pending.has(badge.key)}
                        onClick={() => void toggle(badge)}
                        className="flex w-full flex-col items-center gap-2 rounded-xl border border-white/10 bg-surface-raised p-3 transition-colors hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60"
                      >
                        <BadgeIcon
                          colors={badge.colors}
                          obtained={badge.obtained}
                          className="h-12 w-12"
                        />

                        <span className="text-xs font-semibold tabular-nums text-text-secondary">
                          Nv. {badge.levelCap}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {error}
          </p>
        )}
      </Card>
    </section>
  );
}
