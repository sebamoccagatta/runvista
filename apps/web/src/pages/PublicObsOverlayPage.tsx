import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { isOverlayLayout, type OverlayLayout } from '../runs/overlays/overlay.api';

import { OverlayRenderer, type OverlayTeamPokemon } from '../runs/overlays/OverlayRenderer';

interface PublicOverlayData {
  layout: OverlayLayout;
  pokemon: OverlayTeamPokemon[];
}

interface Viewport {
  width: number;
  height: number;
}

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const RECONNECT_DELAY_MS = 10_000;
const REFRESH_RETRY_DELAY_MS = 5_000;

function getViewport(): Viewport {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTeamPokemon(value: unknown): value is OverlayTeamPokemon {
  if (!isRecord(value)) {
    return false;
  }

  const validSpecies =
    typeof value.speciesId === 'number' && Number.isInteger(value.speciesId) && value.speciesId > 0;

  const validPokemonId =
    value.pokemonId === null ||
    (typeof value.pokemonId === 'number' &&
      Number.isInteger(value.pokemonId) &&
      value.pokemonId > 0);

  const validNickname =
    value.nickname === null || (typeof value.nickname === 'string' && value.nickname.length <= 50);

  const validLevel =
    value.level === null ||
    (typeof value.level === 'number' &&
      Number.isInteger(value.level) &&
      value.level >= 1 &&
      value.level <= 100);

  const validSlot =
    typeof value.teamSlot === 'number' &&
    Number.isInteger(value.teamSlot) &&
    value.teamSlot >= 1 &&
    value.teamSlot <= 6;

  return (
    validSpecies &&
    validPokemonId &&
    validNickname &&
    validLevel &&
    typeof value.isShiny === 'boolean' &&
    validSlot
  );
}

function isPublicOverlayData(value: unknown): value is PublicOverlayData {
  if (
    !isRecord(value) ||
    !isOverlayLayout(value.layout) ||
    !Array.isArray(value.pokemon) ||
    value.pokemon.length > 6 ||
    !value.pokemon.every(isTeamPokemon)
  ) {
    return false;
  }

  const slots = value.pokemon.map((member: OverlayTeamPokemon) => member.teamSlot);

  return new Set(slots).size === slots.length;
}

function PublicObsOverlayContent({ token }: { token: string }) {
  const [viewport, setViewport] = useState<Viewport>(getViewport);

  const [data, setData] = useState<PublicOverlayData | null>(null);

  useEffect(() => {
    document.documentElement.classList.add('runvista-overlay-preview');

    function handleResize() {
      setViewport(getViewport());
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);

      document.documentElement.classList.remove('runvista-overlay-preview');
    };
  }, []);

  useEffect(() => {
    let active = true;
    let revoked = false;
    let requestController: AbortController | null = null;
    let requestSequence = 0;

    const endpoint = `/api/obs/overlays/${encodeURIComponent(token)}`;

    const eventsEndpoint = `${endpoint}/events`;

    let events: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let refreshRetryTimer: ReturnType<typeof setTimeout> | null = null;

    function cancelRefreshRetry() {
      if (refreshRetryTimer !== null) {
        clearTimeout(refreshRetryTimer);
        refreshRetryTimer = null;
      }
    }

    // Un fallo temporal después de una notificación no debe
    // dejar el equipo viejo hasta el próximo evento.
    function scheduleRefreshRetry() {
      if (refreshRetryTimer !== null || !active || revoked) {
        return;
      }

      refreshRetryTimer = setTimeout(() => {
        refreshRetryTimer = null;
        void refresh();
      }, REFRESH_RETRY_DELAY_MS);
    }

    async function refresh() {
      if (!active || revoked) {
        return;
      }

      // Cancelamos la consulta anterior si llega
      // una publicación nueva durante la carga.
      requestController?.abort();

      const controller = new AbortController();
      requestController = controller;

      const sequence = ++requestSequence;

      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          credentials: 'omit',
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
          signal: controller.signal,
        });

        if (!active || revoked || controller.signal.aborted || sequence !== requestSequence) {
          return;
        }

        if ([401, 403, 404, 410].includes(response.status)) {
          revokeLocalAccess();
          return;
        }

        if (!response.ok) {
          scheduleRefreshRetry();
          return;
        }

        const result: unknown = await response.json();

        if (!active || revoked || controller.signal.aborted || sequence !== requestSequence) {
          return;
        }

        if (isPublicOverlayData(result)) {
          cancelRefreshRetry();
          setData(result);
        } else {
          scheduleRefreshRetry();
        }
      } catch {
        // Los errores temporales de red no eliminan
        // el último equipo publicado. Si la consulta
        // fue cancelada por una más nueva, no reintentamos.
        if (!controller.signal.aborted) {
          scheduleRefreshRetry();
        }
      } finally {
        if (requestController === controller) {
          requestController = null;
        }
      }
    }

    function revokeLocalAccess() {
      if (revoked) {
        return;
      }

      revoked = true;
      requestSequence += 1;

      requestController?.abort();
      cancelRefreshRetry();
      stopConnection();

      if (active) {
        setData(null);
      }
    }

    function stopConnection() {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      events?.close();
      events = null;
    }

    function connect() {
      if (!active || revoked || events !== null) {
        return;
      }

      const source = new EventSource(eventsEndpoint);
      events = source;

      function isCurrent() {
        return active && !revoked && events === source;
      }

      source.addEventListener('connected', () => {
        if (isCurrent()) void refresh();
      });

      source.addEventListener('team-published', () => {
        if (isCurrent()) void refresh();
      });

      source.addEventListener('access-revoked', () => {
        if (isCurrent()) revokeLocalAccess();
      });

      source.addEventListener('error', () => {
        if (!isCurrent()) return;

        // EventSource no expone el estado HTTP del error.
        // Revalidamos el enlace incluso si se perdió el evento de revocación.
        stopConnection();
        void refresh();

        // Algunos errores HTTP cierran EventSource definitivamente.
        // Gestionamos un único reintento para recuperar la conexión.
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, RECONNECT_DELAY_MS);
      });
    }

    connect();
    void refresh();

    return () => {
      active = false;
      requestSequence += 1;
      requestController?.abort();
      cancelRefreshRetry();
      stopConnection();
    };
  }, [token]);

  if (!data) {
    // Una fuente nueva, revocada o sin datos válidos
    // debe permanecer visualmente transparente.
    return null;
  }

  const scale = Math.min(
    viewport.width / data.layout.canvas.width,
    viewport.height / data.layout.canvas.height,
  );

  return (
    <main
      aria-label="Overlay para OBS"
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{
        background: 'transparent',
      }}
    >
      <div
        style={{
          width: data.layout.canvas.width,
          height: data.layout.canvas.height,
          flexShrink: 0,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <OverlayRenderer layout={data.layout} pokemon={data.pokemon} />
      </div>
    </main>
  );
}

export function PublicObsOverlayPage() {
  const { token } = useParams<{ token: string }>();

  if (!token || !TOKEN_PATTERN.test(token)) {
    return null;
  }

  return <PublicObsOverlayContent key={token} token={token} />;
}
