import { RunApiError } from '../api/runs.api';

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export interface ObsAccessStatus {
  token: string | null;
  hasLegacyAccess: boolean;
}

function accessPath(runId: string, overlayId: string): string {
  return (
    `/api/runs/${encodeURIComponent(runId)}` +
    `/overlays/${encodeURIComponent(overlayId)}/obs-access`
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_PATTERN.test(value);
}

export async function getObsAccess(runId: string, overlayId: string): Promise<ObsAccessStatus> {
  const response = await fetch(accessPath(runId, overlayId), {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new RunApiError('No pudimos consultar el enlace para OBS', response.status);
  }

  const data: unknown = await response.json();

  if (!isRecord(data)) {
    throw new Error('Invalid OBS access response');
  }

  const rawToken = data.token;
  const rawLegacyAccess = data.hasLegacyAccess;

  let token: string | null;

  if (rawToken === null) {
    token = null;
  } else if (isValidToken(rawToken)) {
    token = rawToken;
  } else {
    throw new Error('Invalid OBS token response');
  }

  if (typeof rawLegacyAccess !== 'boolean') {
    throw new Error('Invalid OBS access response');
  }

  return {
    token,
    hasLegacyAccess: rawLegacyAccess,
  };
}

export async function generateObsAccess(runId: string, overlayId: string): Promise<string> {
  const response = await fetch(accessPath(runId, overlayId), {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new RunApiError('No pudimos generar el enlace para OBS', response.status);
  }

  const data: unknown = await response.json();

  if (!isRecord(data) || !isValidToken(data.token)) {
    throw new Error('Invalid OBS token response');
  }

  return data.token;
}

export async function revokeObsAccess(runId: string, overlayId: string): Promise<void> {
  const response = await fetch(accessPath(runId, overlayId), {
    method: 'DELETE',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new RunApiError('No pudimos revocar el acceso para OBS', response.status);
  }
}

export function getObsAccessErrorMessage(error: unknown): string {
  if (error instanceof RunApiError) {
    if (error.status === 401) {
      return 'Tu sesión expiró. Iniciá sesión nuevamente.';
    }

    if (error.status === 403) {
      return 'No tenés permiso para realizar esta operación.';
    }

    if (error.status === 404) {
      return 'El overlay ya no está disponible.';
    }
  }

  return 'No pudimos completar la operación. Intentá nuevamente.';
}
