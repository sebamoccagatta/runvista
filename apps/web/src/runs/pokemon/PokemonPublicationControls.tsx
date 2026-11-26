import { useEffect, useState } from 'react';

import {
  getPokemonPublication,
  getPublicationErrorMessage,
  publishPokemonTeam,
  type PokemonPublicationStatus,
} from './pokemon-publication.api';

interface PokemonPublicationControlsProps {
  runId: string;
  disabled?: boolean;
}

export function PokemonPublicationControls({
  runId,
  disabled = false,
}: PokemonPublicationControlsProps) {
  const [publication, setPublication] = useState<PokemonPublicationStatus | null>(null);

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getPokemonPublication(runId)
      .then((result) => {
        if (active) {
          setPublication(result);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(getPublicationErrorMessage(cause));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [runId]);

  async function handlePublish() {
    if (publishing || disabled || loading) {
      return;
    }

    setPublishing(true);
    setError(null);
    setMessage(null);

    try {
      const result = await publishPokemonTeam(runId);

      setPublication({
        version: result.version,
        publishedAt: result.publishedAt,
      });

      setMessage(`Equipo publicado correctamente. Versión ${result.version}.`);
    } catch (cause) {
      setError(getPublicationErrorMessage(cause));
    } finally {
      setPublishing(false);
    }
  }

  const date = publication?.publishedAt ? new Date(publication.publishedAt) : null;

  const publishedDate =
    date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat('es-AR', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(date)
      : null;

  return (
    <div className="space-y-3 rounded-xl border border-accent/20 bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h4 className="text-sm font-bold text-text-primary">Publicación del equipo</h4>

          {loading ? (
            <p className="text-xs text-text-secondary">Consultando última publicación...</p>
          ) : publication ? (
            <p className="text-xs text-text-secondary">
              Última publicación: {publishedDate ?? 'Fecha no disponible'}
              {' · '}
              Versión {publication.version}
            </p>
          ) : (
            <p className="text-xs text-text-secondary">Todavía no publicaste este equipo en OBS.</p>
          )}
        </div>

        <button
          type="button"
          disabled={disabled || loading || publishing}
          onClick={() => void handlePublish()}
          className="min-h-11 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {publishing ? 'Publicando...' : 'Actualizar OBS'}
        </button>
      </div>

      <p className="text-xs leading-5 text-text-secondary">
        Los cambios realizados en los Pokémon no se publican automáticamente. Presioná «Actualizar
        OBS» cuando quieras mostrar el equipo actual.
      </p>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-brand/30 bg-brand/10 p-3 text-sm text-brand"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent"
        >
          {message}
        </p>
      )}
    </div>
  );
}
