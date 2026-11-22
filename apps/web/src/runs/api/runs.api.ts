import {
  RUN_STATUSES,
  type CreateRunInput,
  type Run,
  type RunStatus,
  type UpdateRunInput,
} from '../types';

export class RunApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'RunApiError';
    this.status = status;
  }
}

function isRunStatus(value: unknown): value is RunStatus {
  return RUN_STATUSES.some((status) => status === value);
}

export function isRun(value: unknown): value is Run {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    typeof data.id === 'string' &&
    typeof data.title === 'string' &&
    (typeof data.description === 'string' || data.description === null) &&
    isRunStatus(data.status) &&
    typeof data.createdAt === 'string' &&
    typeof data.updatedAt === 'string' &&
    (data.ownerId === undefined || typeof data.ownerId === 'string')
  );
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new RunApiError(`La API respondió con HTTP ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return undefined;
  }

  return response.json();
}

export async function listRuns(signal?: AbortSignal): Promise<Run[]> {
  const data = await request('/api/runs', {
    method: 'GET',
    signal,
  });

  if (!Array.isArray(data) || !data.every(isRun)) {
    throw new Error('Invalid runs response');
  }

  return data;
}

export async function getRun(id: string, signal?: AbortSignal): Promise<Run> {
  const data = await request(`/api/runs/${encodeURIComponent(id)}`, {
    method: 'GET',
    signal,
  });

  if (!isRun(data)) {
    throw new Error('Invalid run response');
  }

  return data;
}

export async function createRun(input: CreateRunInput): Promise<Run> {
  const data = await request('/api/runs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!isRun(data)) {
    throw new Error('Invalid create run response');
  }

  return data;
}

export async function updateRun(id: string, input: UpdateRunInput): Promise<Run> {
  const data = await request(`/api/runs/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!isRun(data)) {
    throw new Error('Invalid update run response');
  }

  return data;
}

export async function deleteRun(id: string): Promise<void> {
  await request(`/api/runs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function getRunErrorMessage(
  error: unknown,
  action: 'load' | 'create' | 'update' | 'delete',
): string {
  if (error instanceof RunApiError) {
    if (error.status === 401) {
      return 'Tu sesión expiró. Iniciá sesión nuevamente.';
    }

    if (error.status === 400) {
      return 'Revisá los datos de la partida.';
    }

    if (error.status === 404) {
      return 'La partida ya no existe o no está disponible.';
    }
  }

  const messages = {
    load: 'No pudimos cargar tus partidas.',
    create: 'No pudimos crear la partida.',
    update: 'No pudimos guardar los cambios.',
    delete: 'No pudimos eliminar la partida.',
  };

  return `${messages[action]} Intentá nuevamente.`;
}
