import { useEffect, useState } from 'react';

import { Card } from '@runvista/ui';

import { RunApiError } from '../api/runs.api';
import { secondaryButton } from '../types';

import { getRunBadges, setRunBadge, type RunBadge, type RunBadgesState } from './badges.api';
import { BadgeIcon } from './BadgeIcon';

interface RunBadgesPanelProps {
  runId: string;
}

type LoadState = 'loading' | 'ready' | 'guest' | 'error';

function describeBadge(badge: RunBadge): string {
  return `${badge.name}, líder ${badge.leader}, tope Nv. ${badge.levelCap}`;
}

export function RunBadgesPanel({ runId }: RunBadgesPanelProps) {
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

            <ul className="grid grid-cols-4 gap-3 sm:grid-cols-8">
              {badges.map((badge) => (
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
