import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { primaryButton, secondaryButton } from '../types';

import {
  generateObsAccess,
  getObsAccess,
  getObsAccessErrorMessage,
  revokeObsAccess,
} from './obs-access.api';

interface OverlayAccessActionsProps {
  runId: string;
  overlayId: string | null;
}

interface SavedOverlayActionsProps {
  runId: string;
  overlayId: string;
}

function SavedOverlayActions({ runId, overlayId }: SavedOverlayActionsProps) {
  const [token, setToken] = useState<string | null>(null);
  const [hasLegacyAccess, setHasLegacyAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getObsAccess(runId, overlayId)
      .then((result) => {
        if (!active) return;

        setToken(result.token);
        setHasLegacyAccess(result.hasLegacyAccess);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;

        setError(getObsAccessErrorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [runId, overlayId]);

  const previewUrl =
    `/app/runs/${encodeURIComponent(runId)}` + `/overlays/${encodeURIComponent(overlayId)}/preview`;

  const obsUrl = token ? `${window.location.origin}/obs/${token}` : null;

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setError(null);
      setMessage(successMessage);
    } catch {
      setError('No pudimos copiar automáticamente. Revisá los permisos del navegador.');
      setMessage(null);
    }
  }

  async function handleGenerate() {
    if (working || loading) return;

    if (
      (token || hasLegacyAccess) &&
      !window.confirm('¿Renovar el enlace? El enlace anterior dejará de funcionar en OBS.')
    ) {
      return;
    }

    setWorking(true);
    setError(null);
    setMessage(null);

    try {
      const newToken = await generateObsAccess(runId, overlayId);

      setToken(newToken);
      setHasLegacyAccess(false);
      setMessage('Enlace guardado correctamente. Podrás recuperarlo al volver a abrir el editor.');
    } catch (cause) {
      setError(getObsAccessErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  }

  async function handleRevoke() {
    if (working || loading) return;

    if (!window.confirm('¿Revocar el acceso? La fuente de OBS dejará de recibir este overlay.')) {
      return;
    }

    setWorking(true);
    setError(null);
    setMessage(null);

    try {
      await revokeObsAccess(runId, overlayId);

      setToken(null);
      setHasLegacyAccess(false);
      setMessage('Acceso revocado correctamente.');
    } catch (cause) {
      setError(getObsAccessErrorMessage(cause));
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="space-y-6 rounded-card border border-accent/20 bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-lg font-bold">Acceso y visualización</h2>
          <p className="max-w-2xl text-sm leading-6 text-text-secondary">
            Administrá el enlace persistente para OBS.
          </p>
        </div>

        <Link to={previewUrl} target="_blank" rel="noopener noreferrer" className={secondaryButton}>
          Abrir vista previa ↗
        </Link>
      </div>

      <div className="space-y-3 border-t border-white/10 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-text-secondary">ID del overlay:</span>

          <code className="max-w-full break-all rounded-lg bg-canvas px-3 py-2 text-xs text-accent">
            {overlayId}
          </code>

          <button
            type="button"
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-text-secondary hover:text-accent"
            onClick={() => void copyText(overlayId, 'ID copiado al portapapeles.')}
          >
            Copiar ID
          </button>
        </div>
      </div>

      <div className="space-y-4 border-t border-white/10 pt-5">
        <div>
          <h3 className="text-base font-bold">Enlace para OBS</h3>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Este enlace permite visualizar el overlay sin iniciar sesión. Mantenelo privado.
          </p>
        </div>

        {loading ? (
          <p role="status" className="text-sm text-text-secondary">
            Recuperando enlace guardado...
          </p>
        ) : obsUrl ? (
          <div className="space-y-3 rounded-xl border border-accent/25 bg-accent/5 p-4">
            <p className="text-xs font-bold text-accent">Enlace activo y guardado</p>

            <input
              aria-label="URL para OBS"
              readOnly
              value={obsUrl}
              onFocus={(event) => event.target.select()}
              className="min-h-11 w-full rounded-lg border border-white/10 bg-canvas px-3 text-xs text-text-primary outline-none focus:border-accent"
            />

            <button
              type="button"
              className={primaryButton}
              disabled={working}
              onClick={() => void copyText(obsUrl, 'Enlace para OBS copiado.')}
            >
              Copiar enlace para OBS
            </button>
          </div>
        ) : hasLegacyAccess ? (
          <p className="rounded-xl border border-accent/25 bg-accent/5 p-4 text-sm text-text-secondary">
            Este overlay tiene un enlace anterior que sigue funcionando, pero no puede recuperarse
            porque se almacenó únicamente su hash. Renovalo para disponer de una URL persistente.
          </p>
        ) : (
          <p className="rounded-xl border border-white/10 bg-canvas/60 p-4 text-sm text-text-secondary">
            Este overlay todavía no tiene un enlace OBS activo. Generá uno para utilizarlo en tu
            transmisión.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={primaryButton}
            disabled={working || loading || Boolean(error && !token && !hasLegacyAccess)}
            onClick={() => void handleGenerate()}
          >
            {working
              ? 'Procesando...'
              : token || hasLegacyAccess
                ? 'Renovar enlace'
                : 'Generar enlace'}
          </button>

          <button
            type="button"
            className={`${secondaryButton} border-red-400/25 text-red-300 hover:border-red-400/50`}
            disabled={working || loading || (!token && !hasLegacyAccess)}
            onClick={() => void handleRevoke()}
          >
            Revocar acceso
          </button>
        </div>

        <p className="text-xs leading-5 text-text-secondary">
          El enlace permanecerá disponible en el editor. Renovarlo invalida el anterior; revocarlo
          deshabilita el acceso sin eliminar el diseño.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-brand/30 bg-brand/10 p-3 text-sm text-brand"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent"
        >
          {message}
        </p>
      )}
    </section>
  );
}

export function OverlayAccessActions({ runId, overlayId }: OverlayAccessActionsProps) {
  if (!overlayId) {
    return (
      <section className="rounded-card border border-white/10 bg-surface p-5">
        <h2 className="text-base font-bold">Acceso al overlay</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Guardá el diseño para generar un enlace para OBS.
        </p>
      </section>
    );
  }

  return <SavedOverlayActions key={`${runId}:${overlayId}`} runId={runId} overlayId={overlayId} />;
}
