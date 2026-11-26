import type { ServerResponse } from 'node:http';

import { OVERLAY_STREAM_CONFIG } from './overlay-stream.config.js';

import { overlayEventBus, type OverlayEvent } from './overlay-events.js';

interface OverlayStreamOptions {
  response: ServerResponse;
  runId: string;
  overlayId: string;
}

export interface OverlayStream {
  sendConnected: () => void;
  revoke: () => void;
  close: () => void;
  isClosed: () => boolean;
}

export function createOverlayStream({
  response,
  runId,
  overlayId,
}: OverlayStreamOptions): OverlayStream {
  let closed = false;

  let heartbeat: ReturnType<typeof setInterval> | null = null;

  let unsubscribe: (() => void) | null = null;

  function cleanup() {
    if (closed) {
      return;
    }

    closed = true;

    if (heartbeat !== null) {
      clearInterval(heartbeat);
      heartbeat = null;
    }

    unsubscribe?.();
    unsubscribe = null;
  }

  function close() {
    cleanup();

    if (!response.destroyed && !response.writableEnded) {
      response.end();
    }
  }

  function destroy() {
    cleanup();

    if (!response.destroyed) {
      response.destroy();
    }
  }

  function write(frame: string): boolean {
    if (closed) {
      return false;
    }

    if (response.destroyed || response.writableEnded) {
      cleanup();
      return false;
    }

    const frameBytes = Buffer.byteLength(frame, 'utf8');

    if (response.writableLength + frameBytes > OVERLAY_STREAM_CONFIG.maxBufferedBytes) {
      destroy();
      return false;
    }

    try {
      const writable = response.write(frame);

      if (!writable) {
        // Evita acumular datos si el cliente no
        // puede consumirlos suficientemente rápido.
        destroy();
        return false;
      }

      return true;
    } catch {
      destroy();
      return false;
    }
  }

  function send(event: string, data: Record<string, unknown>): boolean {
    return write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  function revoke() {
    send('access-revoked', {});
    close();
  }

  function handleEvent(event: OverlayEvent) {
    if (closed) {
      return;
    }

    switch (event.type) {
      case 'team-published':
        send('team-published', {
          version: event.version,
        });
        break;

      case 'access-revoked':
        if (event.overlayId === overlayId) {
          revoke();
        }
        break;

      case 'run-deleted':
        if (event.runId === runId) {
          revoke();
        }
        break;

      case 'server-shutdown':
        close();
        break;
    }
  }

  response.once('close', cleanup);
  response.once('finish', cleanup);
  response.once('error', destroy);

  if (response.destroyed || response.writableEnded) {
    cleanup();

    return {
      sendConnected: () => undefined,
      revoke,
      close,
      isClosed: () => closed,
    };
  }

  unsubscribe = overlayEventBus.subscribe(runId, handleEvent);

  heartbeat = setInterval(() => {
    write(': heartbeat\n\n');
  }, OVERLAY_STREAM_CONFIG.heartbeatIntervalMs);

  heartbeat.unref();

  return {
    sendConnected() {
      write(`retry: ${OVERLAY_STREAM_CONFIG.retryAfterSeconds * 1000}\n\n`);

      send('connected', {});
    },

    revoke,
    close,
    isClosed: () => closed,
  };
}
