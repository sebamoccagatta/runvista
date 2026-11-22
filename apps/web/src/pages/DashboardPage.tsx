import { useEffect, useState } from 'react';

import { Badge, Card } from '@runvista/ui';

import {
  createRun,
  deleteRun,
  getRunErrorMessage,
  listRuns,
  RunApiError,
  updateRun,
} from '../runs/api/runs.api';

import { DeleteRunDialog } from '../runs/components/DeleteRunDialog';
import { RunCard } from '../runs/components/RunCard';
import { RunForm, type RunFormValues } from '../runs/components/RunForm';

import { primaryButton, secondaryButton, type Run } from '../runs/types';

type LoadState = 'loading' | 'ready' | 'guest' | 'error';

type FormMode = { type: 'create' } | { type: 'edit'; run: Run } | null;

export function DashboardPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [retryCount, setRetryCount] = useState(0);

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [deleteTarget, setDeleteTarget] = useState<Run | null>(null);

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    listRuns(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }

        setRuns(data);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof RunApiError && error.status === 401) {
          setRuns([]);
          setLoadState('guest');
          return;
        }

        setLoadState('error');
      });

    return () => {
      controller.abort();
    };
  }, [retryCount]);

  function handleRetry() {
    setLoadState('loading');
    setRetryCount((current) => current + 1);
  }

  function openCreateForm() {
    if (busy) {
      return;
    }

    setFormError(null);
    setFormMode({ type: 'create' });
  }

  function openEditForm(run: Run) {
    if (busy) {
      return;
    }

    setFormError(null);
    setFormMode({ type: 'edit', run });
  }

  function closeForm() {
    if (busy) {
      return;
    }

    setFormError(null);
    setFormMode(null);
  }

  function openDeleteDialog(run: Run) {
    if (busy) {
      return;
    }

    setDeleteError(null);
    setDeleteTarget(run);
  }

  function closeDeleteDialog() {
    if (busy) {
      return;
    }

    setDeleteError(null);
    setDeleteTarget(null);
  }

  function handleExpiredSession() {
    setRuns([]);
    setFormMode(null);
    setDeleteTarget(null);
    setFormError(null);
    setDeleteError(null);
    setLoadState('guest');
  }

  async function handleSave(values: RunFormValues): Promise<void> {
    if (!formMode || busy) {
      return;
    }

    setBusy(true);
    setFormError(null);

    try {
      if (formMode.type === 'create') {
        const created = await createRun({
          title: values.title,
          description: values.description,
        });

        setRuns((current) => [created, ...current]);
      } else {
        const updated = await updateRun(formMode.run.id, {
          title: values.title,
          description: values.description,
          status: values.status,
        });

        setRuns((current) => current.map((run) => (run.id === updated.id ? updated : run)));
      }

      setFormMode(null);
    } catch (error) {
      if (error instanceof RunApiError && error.status === 401) {
        handleExpiredSession();
        return;
      }

      setFormError(getRunErrorMessage(error, formMode.type === 'create' ? 'create' : 'update'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget || busy) {
      return;
    }

    setBusy(true);
    setDeleteError(null);

    try {
      await deleteRun(deleteTarget.id);

      setRuns((current) => current.filter((run) => run.id !== deleteTarget.id));

      setDeleteTarget(null);
    } catch (error) {
      if (error instanceof RunApiError && error.status === 401) {
        handleExpiredSession();
        return;
      }

      setDeleteError(getRunErrorMessage(error, 'delete'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:py-16">
      <header className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <Badge tone="accent">Workspace</Badge>

          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Mis partidas</h1>

          <p className="mt-4 max-w-2xl leading-7 text-text-secondary">
            Organizá tus aventuras Pokémon, gestioná tus desafíos y prepará tus próximas partidas.
          </p>
        </div>

        {loadState === 'ready' && !formMode && (
          <button type="button" disabled={busy} className={primaryButton} onClick={openCreateForm}>
            + Nueva partida
          </button>
        )}
      </header>

      {loadState === 'loading' && (
        <div
          role="status"
          aria-label="Cargando partidas"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              aria-hidden="true"
              className="h-64 animate-pulse rounded-card border border-white/5 bg-surface"
            />
          ))}
        </div>
      )}

      {loadState === 'guest' && (
        <Card className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
          <div aria-hidden="true" className="mb-5 text-4xl text-accent">
            ◇
          </div>

          <h2 className="text-2xl font-bold">Tus aventuras te esperan</h2>

          <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
            Iniciá sesión con Twitch para crear tus partidas y acceder a tus desafíos.
          </p>

          <a href="/api/auth/twitch/login" className={`${primaryButton} mt-6`}>
            Iniciar con Twitch
          </a>
        </Card>
      )}

      {loadState === 'error' && (
        <Card className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
          <h2 className="text-xl font-bold">No pudimos cargar tus partidas</h2>

          <p className="mt-3 text-sm text-text-secondary">
            Revisá tu conexión e intentá nuevamente.
          </p>

          <button type="button" className={`${secondaryButton} mt-6`} onClick={handleRetry}>
            Reintentar
          </button>
        </Card>
      )}

      {loadState === 'ready' && (
        <>
          {formMode && (
            <RunForm
              key={formMode.type === 'create' ? 'create' : formMode.run.id}
              run={formMode.type === 'edit' ? formMode.run : undefined}
              saving={busy}
              error={formError}
              onCancel={closeForm}
              onSubmit={handleSave}
            />
          )}

          {runs.length === 0 ? (
            <Card className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <div
                aria-hidden="true"
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-surface-raised text-3xl text-accent"
              >
                ◇
              </div>

              <Badge tone="accent">Sin partidas</Badge>

              <h2 className="mt-5 text-2xl font-bold">Tu próxima aventura comienza acá</h2>

              <p className="mt-3 max-w-lg text-sm leading-6 text-text-secondary">
                Todavía no creaste ninguna partida. Empezá tu primer desafío Pokémon desde Runvista.
              </p>

              {!formMode && (
                <button type="button" className={`${primaryButton} mt-6`} onClick={openCreateForm}>
                  Crear mi primera partida
                </button>
              )}
            </Card>
          ) : (
            <section aria-label="Listado de partidas">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Tus aventuras</h2>

                <span className="text-sm text-text-secondary">
                  {runs.length} {runs.length === 1 ? 'partida' : 'partidas'}
                </span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {runs.map((run) => (
                  <RunCard
                    key={run.id}
                    run={run}
                    disabled={busy}
                    onEdit={openEditForm}
                    onDelete={openDeleteDialog}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {loadState === 'ready' && deleteTarget && (
        <DeleteRunDialog
          run={deleteTarget}
          deleting={busy}
          error={deleteError}
          onCancel={closeDeleteDialog}
          onConfirm={() => void handleDelete()}
        />
      )}
    </main>
  );
}
