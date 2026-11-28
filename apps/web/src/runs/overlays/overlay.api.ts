import {
  createDefaultOverlayLayout,
  upgradeLayout,
  type OverlayElement,
  type OverlayLayout,
} from '@runvista/overlay-engine';

import { RunApiError } from '../api/runs.api';

export { createDefaultOverlayLayout };

export type { OverlayElement, OverlayLayout };

export interface RunOverlay {
  id: string;
  runId: string;
  name: string;
  layout: OverlayLayout;
  createdAt: string;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * La API siempre responde layouts versión 2, así que el cliente solo acepta esa
 * versión. Las reglas de geometría y estilo vienen del paquete compartido, las
 * mismas que valida el servidor.
 */
export function isOverlayLayout(value: unknown): value is OverlayLayout {
  return isRecord(value) && value.version === 2 && upgradeLayout(value) !== null;
}

function isRunOverlay(value: unknown, runId: string): value is RunOverlay {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.runId === runId &&
    typeof value.name === 'string' &&
    isOverlayLayout(value.layout) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new RunApiError(`HTTP ${response.status}`, response.status);
  }

  if (response.status === 204) {
    return undefined;
  }

  return response.json();
}

function basePath(runId: string): string {
  return `/api/runs/${encodeURIComponent(runId)}/overlays`;
}

export async function listRunOverlays(runId: string, signal?: AbortSignal): Promise<RunOverlay[]> {
  const result = await request(basePath(runId), { signal });

  if (
    !isRecord(result) ||
    !Array.isArray(result.overlays) ||
    !result.overlays.every((item) => isRunOverlay(item, runId))
  ) {
    throw new Error('Invalid overlays response');
  }

  return result.overlays;
}

export async function createRunOverlay(
  runId: string,
  name: string,
  layout: OverlayLayout,
): Promise<RunOverlay> {
  const result = await request(basePath(runId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, layout }),
  });

  if (!isRecord(result) || !isRunOverlay(result.overlay, runId)) {
    throw new Error('Invalid create overlay response');
  }

  return result.overlay;
}

export async function updateRunOverlay(
  runId: string,
  overlayId: string,
  input: { name?: string; layout?: OverlayLayout },
): Promise<RunOverlay> {
  const result = await request(`${basePath(runId)}/${encodeURIComponent(overlayId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (
    !isRecord(result) ||
    !isRunOverlay(result.overlay, runId) ||
    result.overlay.id !== overlayId
  ) {
    throw new Error('Invalid update overlay response');
  }

  return result.overlay;
}

export async function deleteRunOverlay(runId: string, overlayId: string): Promise<void> {
  await request(`${basePath(runId)}/${encodeURIComponent(overlayId)}`, {
    method: 'DELETE',
  });
}

export function getOverlayErrorMessage(error: unknown): string {
  if (error instanceof RunApiError) {
    switch (error.status) {
      case 400:
        return 'El diseño contiene valores no válidos.';
      case 401:
        return 'Tu sesión expiró. Iniciá sesión nuevamente.';
      case 404:
        return 'La partida o el diseño ya no está disponible.';
      case 409:
        return 'Ya existe un diseño con ese nombre en esta partida.';
    }
  }

  return 'No pudimos completar la operación. Intentá nuevamente.';
}
