import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';

import { Badge, Card } from '@runvista/ui';

import { getRun, RunApiError } from '../runs/api/runs.api';
import { RunConfigurationPanel } from '../runs/configuration/RunConfigurationPanel';
import { RunPokemonPanel } from '../runs/pokemon/RunPokemonPanel';

import {
  RUN_STATUS_LABELS,
  RUN_STATUS_STYLES,
  formatRunDate,
  primaryButton,
  secondaryButton,
  type Run,
} from '../runs/types';

type DetailState =
  | { status: 'loading' }
  | { status: 'ready'; run: Run }
  | { status: 'guest' }
  | { status: 'not-found' }
  | { status: 'error' };

const plannedSections = [
  {
    title: 'Capturas',
    description: 'Registro de encuentros y Pokémon obtenidos.',
    symbol: '◎',
  },
  {
    title: 'Progreso',
    description: 'Medallas, líderes y momentos importantes de la aventura.',
    symbol: '◇',
  },
] as const;

function DetailMessage({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
      <div
        aria-hidden="true"
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-surface-raised text-2xl text-accent"
      >
        ◇
      </div>

      <h1 className="text-2xl font-bold">{title}</h1>

      <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">{description}</p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {onRetry && (
          <button type="button" className={primaryButton} onClick={onRetry}>
            Reintentar
          </button>
        )}

        <Link to="/app" className={secondaryButton}>
          Volver a mis partidas
        </Link>
      </div>
    </Card>
  );
}

export function RunDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const [detail, setDetail] = useState<DetailState>({
    status: 'loading',
  });

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!id) {
      return;
    }

    const controller = new AbortController();

    getRun(id, controller.signal)
      .then((run) => {
        if (!controller.signal.aborted) {
          setDetail({
            status: 'ready',
            run,
          });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof RunApiError) {
          if (error.status === 401) {
            setDetail({ status: 'guest' });
            return;
          }

          if (error.status === 404 || error.status === 400) {
            setDetail({ status: 'not-found' });
            return;
          }
        }

        setDetail({ status: 'error' });
      });

    return () => controller.abort();
  }, [id, retryCount]);

  function handleRetry() {
    setDetail({ status: 'loading' });
    setRetryCount((current) => current + 1);
  }

  if (!id) {
    return (
      <main className="mx-auto w-full max-w-6xl px-5 py-12">
        <DetailMessage
          title="Partida no disponible"
          description="No encontramos el identificador de esta partida."
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <Link
        to="/app"
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span aria-hidden="true">←</span>
        Mis partidas
      </Link>

      {detail.status === 'loading' && (
        <div role="status" aria-label="Cargando detalle de partida" className="mt-9 space-y-6">
          <div className="h-36 animate-pulse rounded-card bg-surface" />

          <div className="grid gap-5 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-44 animate-pulse rounded-card bg-surface"
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      )}

      {detail.status === 'guest' && (
        <div className="mt-9">
          <Card className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <h1 className="text-2xl font-bold">Iniciá sesión para continuar</h1>

            <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
              Necesitás una sesión de Twitch activa para consultar esta partida.
            </p>

            <a href="/api/auth/twitch/login" className={`${primaryButton} mt-6`}>
              Iniciar con Twitch
            </a>
          </Card>
        </div>
      )}

      {detail.status === 'not-found' && (
        <div className="mt-9">
          <DetailMessage
            title="No encontramos esta partida"
            description="Es posible que haya sido eliminada o que no tengas acceso a ella."
          />
        </div>
      )}

      {detail.status === 'error' && (
        <div className="mt-9">
          <DetailMessage
            title="No pudimos cargar la partida"
            description="Ocurrió un problema al consultar sus datos."
            onRetry={handleRetry}
          />
        </div>
      )}

      {detail.status === 'ready' && (
        <div className="mt-8 space-y-8">
          <header className="overflow-hidden rounded-card border border-white/10 bg-surface">
            <div className="h-1.5 bg-gradient-to-r from-brand via-accent to-success" />

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="accent">Partida Pokémon</Badge>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    RUN_STATUS_STYLES[detail.run.status]
                  }`}
                >
                  {RUN_STATUS_LABELS[detail.run.status]}
                </span>
              </div>

              <h1 className="mt-5 break-words text-3xl font-black tracking-tight sm:text-5xl">
                {detail.run.title}
              </h1>

              <p className="mt-4 max-w-3xl whitespace-pre-wrap break-words text-sm leading-7 text-text-secondary sm:text-base">
                {detail.run.description || 'Esta aventura todavía no tiene una descripción.'}
              </p>

              <div className="mt-7 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/10 pt-6">
                <div>
                  <p className="text-xs text-text-secondary">Creada</p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatRunDate(detail.run.createdAt)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-text-secondary">Última actualización</p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatRunDate(detail.run.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <section aria-labelledby="run-modules-heading">
            <div className="mb-5">
              <h2 id="run-modules-heading" className="text-2xl font-bold">
                Tu aventura
              </h2>

              <p className="mt-2 text-sm text-text-secondary">
                Acá vas a administrar el contenido y el progreso de esta partida.
              </p>
            </div>

            <div className="grid items-start gap-5 sm:grid-cols-2">
              <RunConfigurationPanel key={detail.run.id} runId={detail.run.id} />

              <Link
                to={`/app/runs/${detail.run.id}/overlays`}
                className="group flex min-h-44 flex-col justify-between gap-5 rounded-card border border-accent/25 bg-surface p-5 transition-colors hover:border-accent/60 hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-accent sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-2xl text-accent"
                  >
                    ◈
                  </div>

                  <span className="rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                    Disponible
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-text-primary">Overlays para OBS</h3>

                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    Creá, personalizá y consultá los diseños de tu equipo Pokémon para tus
                    transmisiones.
                  </p>

                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-accent group-hover:underline">
                    Administrar overlays
                    <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>

              {plannedSections.map((section) => (
                <Card key={section.title} className="flex min-h-44 flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div
                      aria-hidden="true"
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-surface-raised text-2xl text-accent"
                    >
                      {section.symbol}
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-text-secondary">
                      Próximamente
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold">{section.title}</h3>

                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      {section.description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <div className="border-t border-white/10 pt-8">
            <RunPokemonPanel runId={detail.run.id} />
          </div>
        </div>
      )}
    </main>
  );
}
