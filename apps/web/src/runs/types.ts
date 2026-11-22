export const RUN_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED'] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

export interface Run {
  id: string;
  title: string;
  description: string | null;
  status: RunStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRunInput {
  title: string;
  description: string | null;
}

export interface UpdateRunInput {
  title?: string;
  description?: string | null;
  status?: RunStatus;
}

export const RUN_STATUS_LABELS: Record<RunStatus, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'En curso',
  PAUSED: 'Pausada',
  COMPLETED: 'Completada',
  ABANDONED: 'Abandonada',
};

export const RUN_STATUS_STYLES: Record<RunStatus, string> = {
  DRAFT: 'border-white/10 bg-white/5 text-text-secondary',
  ACTIVE: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  PAUSED: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  COMPLETED: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  ABANDONED: 'border-red-400/20 bg-red-400/10 text-red-300',
};

export const primaryButton =
  'inline-flex min-h-11 items-center justify-center rounded-xl ' +
  'bg-brand px-5 py-2.5 text-sm font-bold text-white ' +
  'transition-colors hover:bg-brand-hover ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';

export const secondaryButton =
  'inline-flex min-h-11 items-center justify-center rounded-xl ' +
  'border border-white/15 px-5 py-2.5 text-sm font-semibold ' +
  'text-text-secondary transition-colors hover:bg-white/5 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50';

export const inputStyles =
  'w-full rounded-xl border border-white/15 bg-canvas px-4 py-3 ' +
  'text-sm text-text-primary placeholder:text-text-secondary/60 ' +
  'focus:border-accent focus:outline-none disabled:opacity-60';

export function formatRunDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
