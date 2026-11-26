export interface PokemonPublicationStatus {
  version: number;
  publishedAt: string;
}

export interface PublishedPokemon {
  speciesId: number;
  pokemonId: number | null;
  nickname: string | null;
  level: number | null;
  isShiny: boolean;
  teamSlot: number;
}

export interface PokemonPublication extends PokemonPublicationStatus {
  pokemon: PublishedPokemon[];
}

export class PokemonPublicationApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);

    this.name = 'PokemonPublicationApiError';
    this.status = status;
  }
}

function publicationPath(runId: string): string {
  return `/api/runs/${encodeURIComponent(runId)}/pokemon/publication`;
}

function publishPath(runId: string): string {
  return `/api/runs/${encodeURIComponent(runId)}/pokemon/publish`;
}

async function request<T>(url: string, method: 'GET' | 'POST'): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new PokemonPublicationApiError('No se pudo completar la operación.', response.status);
  }

  return (await response.json()) as T;
}

export async function getPokemonPublication(
  runId: string,
): Promise<PokemonPublicationStatus | null> {
  const result = await request<{
    publication: PokemonPublicationStatus | null;
  }>(publicationPath(runId), 'GET');

  return result.publication;
}

export async function publishPokemonTeam(runId: string): Promise<PokemonPublication> {
  const result = await request<{
    publication: PokemonPublication;
  }>(publishPath(runId), 'POST');

  return result.publication;
}

export function getPublicationErrorMessage(error: unknown): string {
  if (error instanceof PokemonPublicationApiError) {
    switch (error.status) {
      case 401:
        return 'Tu sesión expiró. Iniciá sesión nuevamente.';
      case 403:
        return 'No tenés permisos para publicar este equipo.';
      case 404:
        return 'La partida ya no está disponible.';
      case 409:
        return 'Hubo un conflicto al publicar. Intentá nuevamente.';
    }
  }

  return 'No pudimos publicar el equipo. Intentá nuevamente.';
}
