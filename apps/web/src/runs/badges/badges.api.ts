import { RunApiError } from '../api/runs.api';

export interface RunBadge {
  key: string;
  region: string;
  name: string;
  leader: string;
  colors: { primary: string; secondary: string };
  levelCap: number;
  obtained: boolean;
  obtainedAt: string | null;
}

export type RunBadgesState =
  | { configured: false; badges: [] }
  | { configured: true; gameId: string; levelCapIncrease: number; badges: RunBadge[] };

const HEX_COLOR = /^#[0-9a-f]{6}$/;

function isBadge(value: unknown): value is RunBadge {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const data = value as Record<string, unknown>;
  const colors = data.colors as Record<string, unknown> | undefined;

  return (
    typeof data.key === 'string' &&
    typeof data.region === 'string' &&
    typeof data.name === 'string' &&
    typeof data.leader === 'string' &&
    typeof colors?.primary === 'string' &&
    HEX_COLOR.test(colors.primary) &&
    typeof colors?.secondary === 'string' &&
    HEX_COLOR.test(colors.secondary) &&
    typeof data.levelCap === 'number' &&
    typeof data.obtained === 'boolean' &&
    (data.obtainedAt === null || typeof data.obtainedAt === 'string')
  );
}

function isState(value: unknown): value is RunBadgesState {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const data = value as Record<string, unknown>;

  if (!Array.isArray(data.badges) || !data.badges.every(isBadge)) {
    return false;
  }

  if (data.configured === false) {
    return data.badges.length === 0;
  }

  return (
    data.configured === true &&
    typeof data.gameId === 'string' &&
    typeof data.levelCapIncrease === 'number'
  );
}

export async function getRunBadges(runId: string, signal?: AbortSignal): Promise<RunBadgesState> {
  const response = await fetch(`/api/runs/${encodeURIComponent(runId)}/badges`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new RunApiError(`La API respondió con HTTP ${response.status}`, response.status);
  }

  const payload: unknown = await response.json();

  if (!isState(payload)) {
    throw new Error('Invalid badges response');
  }

  return payload;
}

export async function setRunBadge(
  runId: string,
  key: string,
  obtained: boolean,
): Promise<{ obtainedAt: string | null }> {
  const response = await fetch(
    `/api/runs/${encodeURIComponent(runId)}/badges/${encodeURIComponent(key)}`,
    {
      method: 'PUT',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ obtained }),
    },
  );

  if (!response.ok) {
    throw new RunApiError(`La API respondió con HTTP ${response.status}`, response.status);
  }

  const payload = (await response.json()) as { obtainedAt?: unknown };
  const raw = payload.obtainedAt ?? null;

  if (raw !== null && typeof raw !== 'string') {
    throw new Error('Invalid badge response');
  }

  return { obtainedAt: typeof raw === 'string' ? raw : null };
}
