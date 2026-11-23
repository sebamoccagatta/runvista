import { isPokemonSpeciesId } from '@runvista/pokemon/species';
import { isPokemonVarietyForSpecies } from '@runvista/pokemon/varieties';

import { RunApiError } from '../api/runs.api';

export const POKEMON_STATUSES = ['TEAM', 'BOX', 'FAINTED'] as const;

export type PokemonStatus = (typeof POKEMON_STATUSES)[number];

export interface RunPokemon {
  id: string;
  runId: string;
  speciesId: number;
  pokemonId?: number | null;
  nickname: string | null;
  level: number | null;
  isShiny: boolean;
  status: PokemonStatus;
  teamSlot: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePokemonInput {
  speciesId: number;
  pokemonId?: number | null;
  nickname?: string | null;
  level?: number | null;
  isShiny?: boolean;
  status?: PokemonStatus;
  teamSlot?: number | null;
}

export interface UpdatePokemonInput {
  pokemonId?: number | null;
  nickname?: string | null;
  level?: number | null;
  isShiny?: boolean;
}

export interface MovePokemonInput {
  status: PokemonStatus;
  teamSlot?: number | null;
}

function isPokemonStatus(value: unknown): value is PokemonStatus {
  return POKEMON_STATUSES.some((status) => status === value);
}

export function isRunPokemon(value: unknown): value is RunPokemon {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const data = value as Record<string, unknown>;

  if (typeof data.speciesId !== 'number' || !isPokemonSpeciesId(data.speciesId)) {
    return false;
  }

  const validVariety =
    data.pokemonId === undefined ||
    data.pokemonId === null ||
    (typeof data.pokemonId === 'number' &&
      isPokemonVarietyForSpecies(data.speciesId, data.pokemonId));

  const validNickname =
    data.nickname === null || (typeof data.nickname === 'string' && data.nickname.length <= 50);

  const validLevel =
    data.level === null ||
    (typeof data.level === 'number' &&
      Number.isInteger(data.level) &&
      data.level >= 1 &&
      data.level <= 100);

  const validPosition =
    data.status === 'TEAM'
      ? typeof data.teamSlot === 'number' &&
        Number.isInteger(data.teamSlot) &&
        data.teamSlot >= 1 &&
        data.teamSlot <= 6
      : data.teamSlot === null;

  return (
    typeof data.id === 'string' &&
    typeof data.runId === 'string' &&
    validVariety &&
    validNickname &&
    validLevel &&
    typeof data.isShiny === 'boolean' &&
    isPokemonStatus(data.status) &&
    validPosition &&
    typeof data.createdAt === 'string' &&
    typeof data.updatedAt === 'string'
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

  return response.json();
}

function getPokemonPath(runId: string): string {
  return `/api/runs/${encodeURIComponent(runId)}/pokemon`;
}

function getPokemonItemPath(runId: string, pokemonId: string): string {
  return `${getPokemonPath(runId)}/${encodeURIComponent(pokemonId)}`;
}

function parsePokemonResponse(response: unknown, runId: string): RunPokemon {
  if (
    typeof response !== 'object' ||
    response === null ||
    Array.isArray(response) ||
    !('pokemon' in response)
  ) {
    throw new Error('Invalid Pokemon response');
  }

  const pokemon = response.pokemon;

  if (!isRunPokemon(pokemon) || pokemon.runId !== runId) {
    throw new Error('Invalid Pokemon response');
  }

  return pokemon;
}

export async function listRunPokemon(runId: string, signal?: AbortSignal): Promise<RunPokemon[]> {
  const response = await request(getPokemonPath(runId), {
    method: 'GET',
    signal,
  });

  if (
    typeof response !== 'object' ||
    response === null ||
    Array.isArray(response) ||
    !('pokemon' in response) ||
    !Array.isArray(response.pokemon) ||
    !response.pokemon.every((pokemon) => isRunPokemon(pokemon) && pokemon.runId === runId)
  ) {
    throw new Error('Invalid Pokemon list response');
  }

  return response.pokemon;
}

export async function createRunPokemon(
  runId: string,
  input: CreatePokemonInput,
): Promise<RunPokemon> {
  const response = await request(getPokemonPath(runId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return parsePokemonResponse(response, runId);
}

export async function updateRunPokemon(
  runId: string,
  pokemonId: string,
  input: UpdatePokemonInput,
): Promise<RunPokemon> {
  const response = await request(getPokemonItemPath(runId, pokemonId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const pokemon = parsePokemonResponse(response, runId);

  if (pokemon.id !== pokemonId) {
    throw new Error('Invalid Pokemon response');
  }

  return pokemon;
}

export async function moveRunPokemon(
  runId: string,
  pokemonId: string,
  input: MovePokemonInput,
): Promise<RunPokemon> {
  const response = await request(`${getPokemonItemPath(runId, pokemonId)}/move`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const pokemon = parsePokemonResponse(response, runId);

  if (pokemon.id !== pokemonId) {
    throw new Error('Invalid Pokemon response');
  }

  return pokemon;
}

export function getPokemonErrorMessage(error: unknown): string {
  if (error instanceof RunApiError) {
    if (error.status === 401) {
      return 'Tu sesión expiró. Iniciá sesión nuevamente.';
    }

    if (error.status === 400) {
      return 'Los datos del Pokémon no son válidos.';
    }

    if (error.status === 404) {
      return 'La partida o el Pokémon ya no está disponible.';
    }

    if (error.status === 409) {
      return 'Esa posición del equipo ya está ocupada.';
    }
  }

  return 'No pudimos completar la operación. Intentá nuevamente.';
}
