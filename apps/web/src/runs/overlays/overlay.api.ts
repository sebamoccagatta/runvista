import { RunApiError } from '../api/runs.api';

export interface OverlayElement {
  slot: number;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  showNickname: boolean;
  showSpecies: boolean;
  showLevel: boolean;
}

export interface OverlayLayout {
  version: 1;
  canvas: {
    width: 1920;
    height: 1080;
  };
  elements: OverlayElement[];
}

export interface RunOverlay {
  id: string;
  runId: string;
  name: string;
  layout: OverlayLayout;
  createdAt: string;
  updatedAt: string;
}

export function createDefaultOverlayLayout(): OverlayLayout {
  return {
    version: 1,
    canvas: {
      width: 1920,
      height: 1080,
    },
    elements: Array.from({ length: 6 }, (_, index) => ({
      slot: index + 1,
      x: 120 + index * 280,
      y: 820,
      width: 220,
      height: 190,
      visible: true,
      showNickname: true,
      showSpecies: false,
      showLevel: true,
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isOverlayLayout(value: unknown): value is OverlayLayout {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.canvas)) {
    return false;
  }

  if (value.canvas.width !== 1920 || value.canvas.height !== 1080) {
    return false;
  }

  if (!Array.isArray(value.elements) || value.elements.length !== 6) {
    return false;
  }

  const slots = new Set<number>();

  for (const element of value.elements) {
    if (!isRecord(element)) {
      return false;
    }

    const { slot, x, y, width, height } = element;

    if (
      !Number.isInteger(slot) ||
      typeof slot !== 'number' ||
      slot < 1 ||
      slot > 6 ||
      slots.has(slot)
    ) {
      return false;
    }

    slots.add(slot);

    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof width !== 'number' ||
      typeof height !== 'number' ||
      ![x, y, width, height].every(Number.isInteger) ||
      x < 0 ||
      y < 0 ||
      width < 80 ||
      width > 600 ||
      height < 80 ||
      height > 600 ||
      x + width > 1920 ||
      y + height > 1080
    ) {
      return false;
    }

    if (
      typeof element.visible !== 'boolean' ||
      typeof element.showNickname !== 'boolean' ||
      typeof element.showSpecies !== 'boolean' ||
      typeof element.showLevel !== 'boolean'
    ) {
      return false;
    }
  }

  return slots.size === 6;
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
