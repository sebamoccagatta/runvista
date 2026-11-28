import { isPokemonGameId } from '@runvista/pokemon';

import { RunApiError } from '../api/runs.api';

export const CHALLENGE_TYPES = ['NORMAL', 'NUZLOCKE', 'RANDOMLOCKE', 'CUSTOM'] as const;

export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

export const CHALLENGE_LABELS: Record<ChallengeType, string> = {
  NORMAL: 'Normal',
  NUZLOCKE: 'Nuzlocke',
  RANDOMLOCKE: 'Randomlocke',
  CUSTOM: 'Personalizado',
};

export const MAX_LEVEL_CAP_INCREASE = 100;

export interface RunConfiguration {
  runId: string;
  gameId: string;
  challengeType: ChallengeType;
  /** Aumento porcentual del nivel de los rivales; se aplica a los topes de medalla. */
  levelCapIncrease: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveRunConfigurationInput {
  gameId: string;
  challengeType: ChallengeType;
  levelCapIncrease?: number;
}

function isChallengeType(value: unknown): value is ChallengeType {
  return CHALLENGE_TYPES.some((type) => type === value);
}

function isConfiguration(value: unknown): value is RunConfiguration {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    typeof data.runId === 'string' &&
    typeof data.gameId === 'string' &&
    isPokemonGameId(data.gameId) &&
    isChallengeType(data.challengeType) &&
    Number.isInteger(data.levelCapIncrease) &&
    (data.levelCapIncrease as number) >= 0 &&
    (data.levelCapIncrease as number) <= MAX_LEVEL_CAP_INCREASE &&
    typeof data.createdAt === 'string' &&
    typeof data.updatedAt === 'string'
  );
}

async function request(runId: string, options: RequestInit): Promise<RunConfiguration | null> {
  const response = await fetch(`/api/runs/${encodeURIComponent(runId)}/configuration`, {
    ...options,
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new RunApiError(`La API respondió con HTTP ${response.status}`, response.status);
  }

  const payload: unknown = await response.json();

  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload) ||
    !('configuration' in payload)
  ) {
    throw new Error('Invalid configuration response');
  }

  const configuration = payload.configuration;

  if (configuration === null) {
    return null;
  }

  if (!isConfiguration(configuration) || configuration.runId !== runId) {
    throw new Error('Invalid configuration response');
  }

  return configuration;
}

export function getRunConfiguration(
  runId: string,
  signal?: AbortSignal,
): Promise<RunConfiguration | null> {
  return request(runId, {
    method: 'GET',
    signal,
  });
}

export async function saveRunConfiguration(
  runId: string,
  input: SaveRunConfigurationInput,
): Promise<RunConfiguration> {
  const configuration = await request(runId, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!configuration) {
    throw new Error('Invalid save configuration response');
  }

  return configuration;
}
