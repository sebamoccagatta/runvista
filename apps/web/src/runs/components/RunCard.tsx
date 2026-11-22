import { Card } from '@runvista/ui';

import { RUN_STATUS_LABELS, RUN_STATUS_STYLES, formatRunDate, type Run } from '../types';

interface RunCardProps {
  run: Run;
  disabled?: boolean;
  onEdit: (run: Run) => void;
  onDelete: (run: Run) => void;
}

export function RunCard({ run, disabled = false, onEdit, onDelete }: RunCardProps) {
  return (
    <Card className="flex h-full flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-surface-raised text-2xl text-accent"
        >
          ◇
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${RUN_STATUS_STYLES[run.status]}`}
        >
          {RUN_STATUS_LABELS[run.status]}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="break-words text-xl font-bold text-text-primary">{run.title}</h2>

        <p className="mt-3 line-clamp-3 min-h-12 break-words text-sm leading-6 text-text-secondary">
          {run.description || 'Esta partida todavía no tiene descripción.'}
        </p>
      </div>

      <div className="border-t border-white/10 pt-4">
        <p className="text-xs text-text-secondary">Creada el {formatRunDate(run.createdAt)}</p>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onEdit(run)}
            aria-label={`Editar ${run.title}`}
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-white/15 px-3 text-sm font-semibold text-text-primary transition-colors hover:border-brand/50 hover:bg-brand/10 disabled:opacity-50"
          >
            Editar
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onDelete(run)}
            aria-label={`Eliminar ${run.title}`}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-400/20 px-3 text-sm font-semibold text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>
      </div>
    </Card>
  );
}
