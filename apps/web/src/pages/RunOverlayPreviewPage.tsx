import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { listRunPokemon, type RunPokemon } from '../runs/pokemon/pokemon.api';

import { listRunOverlays, type RunOverlay } from '../runs/overlays/overlay.api';

import { OverlayRenderer } from '../runs/overlays/OverlayRenderer';

interface Viewport {
  width: number;
  height: number;
}

type PreviewState =
  | { status: 'loading' }
  | {
      status: 'ready';
      overlay: RunOverlay;
      pokemon: RunPokemon[];
    }
  | { status: 'error' };

function getViewport(): Viewport {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export function RunOverlayPreviewPage() {
  const { id: runId, overlayId } = useParams<{
    id: string;
    overlayId: string;
  }>();

  const [viewport, setViewport] = useState(getViewport);

  const [preview, setPreview] = useState<PreviewState>({
    status: 'loading',
  });

  // Aislar visualmente esta página del resto de Runvista.
  useEffect(() => {
    document.documentElement.classList.add('runvista-overlay-preview');

    function handleResize() {
      setViewport(getViewport());
    }

    window.addEventListener('resize', handleResize);

    return () => {
      document.documentElement.classList.remove('runvista-overlay-preview');

      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Recuperar el diseño y los Pokémon de la partida.
  useEffect(() => {
    if (!runId || !overlayId) {
      return;
    }

    const controller = new AbortController();

    Promise.all([
      listRunOverlays(runId, controller.signal),
      listRunPokemon(runId, controller.signal),
    ])
      .then(([overlays, pokemon]) => {
        if (controller.signal.aborted) {
          return;
        }

        const overlay = overlays.find((item) => item.id === overlayId);

        if (!overlay) {
          setPreview({ status: 'error' });
          return;
        }

        setPreview({
          status: 'ready',
          overlay,
          pokemon,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPreview({ status: 'error' });
        }
      });

    return () => {
      controller.abort();
    };
  }, [runId, overlayId]);

  if (!runId || !overlayId) {
    return (
      <div role="alert" className="p-4 text-sm text-white">
        Vista previa no disponible.
      </div>
    );
  }

  if (preview.status === 'loading') {
    return (
      <div role="status" className="p-4 text-sm text-white">
        Cargando overlay...
      </div>
    );
  }

  if (preview.status === 'error') {
    return (
      <div role="alert" className="p-4 text-sm text-white">
        No pudimos cargar este overlay.
      </div>
    );
  }

  const { overlay, pokemon } = preview;

  const scale = Math.min(
    viewport.width / overlay.layout.canvas.width,
    viewport.height / overlay.layout.canvas.height,
  );

  return (
    <main
      aria-label="Vista previa del overlay"
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{
        background: 'transparent',
      }}
    >
      <div
        style={{
          width: overlay.layout.canvas.width,
          height: overlay.layout.canvas.height,
          flexShrink: 0,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <OverlayRenderer layout={overlay.layout} pokemon={pokemon} />
      </div>
    </main>
  );
}
