import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../app.js';
import { overlayEventBus } from './overlay-events.js';
import { OVERLAY_STREAM_CONFIG } from './overlay-stream.config.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '660e8400-e29b-41d4-a716-446655440000';
const otherRunId = '880e8400-e29b-41d4-a716-446655440000';
const overlayId = '770e8400-e29b-41d4-a716-446655440000';

const token = 'a'.repeat(64);
const origin = 'http://localhost:5173';

const READ_TIMEOUT_MS = 3000;

type App = ReturnType<typeof buildApp>;

interface SseMessage {
  event: string;
  data: unknown;
}

interface SseClient {
  readEvent: () => Promise<SseMessage>;
  close: () => void;
  expectEnd: () => Promise<void>;
}

const apps: App[] = [];
const clients: SseClient[] = [];

function createTestApp() {
  const service = {
    getObsAccess: vi.fn().mockResolvedValue({
      found: true,
      token,
      hasLegacyAccess: false,
    }),

    issueObsToken: vi.fn().mockResolvedValue('b'.repeat(64)),

    revokeObsToken: vi.fn().mockResolvedValue(true),

    getPublicOverlay: vi.fn().mockResolvedValue(null),

    getObsStreamAccess: vi.fn().mockResolvedValue({
      overlayId,
      runId,
    }),
  };

  const app = buildApp({
    allowedOrigins: [origin],
    obsOverlays: {
      service,
      resolveActorId: () => actorId,
    },
  });

  apps.push(app);

  return { app, service };
}

async function startServer(app: App): Promise<string> {
  return app.listen({
    host: '127.0.0.1',
    port: 0,
  });
}

async function readWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error('Timed out waiting for SSE data'));
        }, READ_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

async function connectSse(baseUrl: string, accessToken = token): Promise<SseClient> {
  const controller = new AbortController();

  const response = await fetch(`${baseUrl}/api/obs/overlays/${accessToken}/events`, {
    method: 'GET',
    signal: controller.signal,
    headers: {
      Accept: 'text/event-stream',
    },
  });

  if (response.status !== 200 || !response.body) {
    controller.abort();

    throw new Error(`Expected SSE response 200, got ${response.status}`);
  }

  expect(response.headers.get('content-type')).toContain('text/event-stream');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';

  async function readEvent(): Promise<SseMessage> {
    while (true) {
      const separator = buffer.indexOf('\n\n');

      if (separator !== -1) {
        const frame = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);

        const lines = frame.split('\n');

        // Ignorar comentarios SSE utilizados como heartbeat.
        if (lines.every((line) => !line.startsWith('event:'))) {
          continue;
        }

        const eventLine = lines.find((line) => line.startsWith('event:'));

        const dataLine = lines.find((line) => line.startsWith('data:'));

        if (!eventLine) {
          continue;
        }

        const event = eventLine.slice('event:'.length).trim();

        const rawData = dataLine ? dataLine.slice('data:'.length).trim() : '{}';

        return {
          event,
          data: JSON.parse(rawData) as unknown,
        };
      }

      const result = await readWithTimeout(reader);

      if (result.done) {
        throw new Error('SSE connection closed unexpectedly');
      }

      buffer += decoder.decode(result.value, {
        stream: true,
      });
    }
  }

  const client: SseClient = {
    readEvent,

    async expectEnd() {
      expect(buffer).toBe('');
      const result = await readWithTimeout(reader);
      expect(result.done).toBe(true);
    },

    close() {
      controller.abort();
      void reader.cancel().catch(() => undefined);
    },
  };

  clients.push(client);

  return client;
}

afterEach(async () => {
  for (const client of clients.splice(0)) {
    client.close();
  }

  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('OBS SSE integration', () => {
  it('opens a real SSE connection', async () => {
    const { app, service } = createTestApp();
    const baseUrl = await startServer(app);

    const client = await connectSse(baseUrl);

    const message = await client.readEvent();

    expect(message).toEqual({
      event: 'connected',
      data: {},
    });

    expect(service.getObsStreamAccess).toHaveBeenCalledWith(token);

    expect(service.getObsStreamAccess).toHaveBeenCalledTimes(2);
  });

  it('notifies the overlay when its team is published', async () => {
    const { app } = createTestApp();
    const baseUrl = await startServer(app);

    const client = await connectSse(baseUrl);

    expect((await client.readEvent()).event).toBe('connected');

    overlayEventBus.publishTeam(runId, 3);

    const message = await client.readEvent();

    expect(message).toEqual({
      event: 'team-published',
      data: {
        version: 3,
      },
    });
  });

  it('does not notify an overlay about another run', async () => {
    const { app } = createTestApp();
    const baseUrl = await startServer(app);

    const client = await connectSse(baseUrl);

    await client.readEvent();

    // Este evento pertenece a otra partida.
    overlayEventBus.publishTeam(otherRunId, 99);

    // El evento esperado pertenece a la partida correcta.
    overlayEventBus.publishTeam(runId, 4);

    const message = await client.readEvent();

    expect(message).toEqual({
      event: 'team-published',
      data: {
        version: 4,
      },
    });
  });

  it('closes the previous stream when the link is renewed', async () => {
    const { app, service } = createTestApp();
    const baseUrl = await startServer(app);

    const client = await connectSse(baseUrl);

    await client.readEvent();

    const response = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}` + `/overlays/${overlayId}/obs-access`,
      headers: {
        origin,
      },
    });

    expect(response.statusCode).toBe(201);

    expect(service.issueObsToken).toHaveBeenCalledWith(actorId, runId, overlayId);

    const message = await client.readEvent();

    expect(message).toEqual({
      event: 'access-revoked',
      data: {},
    });

    await client.expectEnd();
  });

  it('notifies the stream when its access is revoked', async () => {
    const { app, service } = createTestApp();
    const baseUrl = await startServer(app);

    const client = await connectSse(baseUrl);

    await client.readEvent();

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/runs/${runId}` + `/overlays/${overlayId}/obs-access`,
      headers: {
        origin,
      },
    });

    expect(response.statusCode).toBe(204);

    expect(service.revokeObsToken).toHaveBeenCalledWith(actorId, runId, overlayId);

    const message = await client.readEvent();

    expect(message).toEqual({
      event: 'access-revoked',
      data: {},
    });

    await client.expectEnd();
  });

  it('rejects invalid SSE access tokens', async () => {
    const { app, service } = createTestApp();
    const baseUrl = await startServer(app);

    const response = await fetch(`${baseUrl}/api/obs/overlays/invalid/events`);

    expect(response.status).toBe(404);

    expect(service.getObsStreamAccess).not.toHaveBeenCalled();
  });

  it('rejects a revoked or unknown SSE token', async () => {
    const { app, service } = createTestApp();

    service.getObsStreamAccess.mockResolvedValueOnce(null);

    const baseUrl = await startServer(app);

    const response = await fetch(`${baseUrl}/api/obs/overlays/${token}/events`);

    expect(response.status).toBe(404);
  });

  it('releases subscriptions when the client disconnects', async () => {
    const { app } = createTestApp();
    const baseUrl = await startServer(app);

    const client = await connectSse(baseUrl);

    await client.readEvent();

    expect(overlayEventBus.getSubscriberCount(runId)).toBe(1);

    client.close();

    await vi.waitFor(() => {
      expect(overlayEventBus.getSubscriberCount(runId)).toBe(0);
    });
  });

  it('rejects connections when the run limit is reached', async () => {
    const { app } = createTestApp();
    const baseUrl = await startServer(app);

    const subscriptions = Array.from({ length: 20 }, () =>
      overlayEventBus.subscribe(runId, vi.fn()),
    );

    try {
      const response = await fetch(`${baseUrl}/api/obs/overlays/${token}/events`);

      expect(response.status).toBe(503);

      expect(response.headers.get('retry-after')).toBe('10');

      expect(await response.json()).toEqual({
        error: 'OVERLAY_CONNECTION_LIMIT',
      });

      expect(overlayEventBus.getSubscriberCount(runId)).toBe(20);
    } finally {
      subscriptions.forEach((unsubscribe) => {
        unsubscribe();
      });
    }
  });

  it('revokes access if the token becomes invalid during connection', async () => {
    const { app, service } = createTestApp();

    service.getObsStreamAccess
      .mockResolvedValueOnce({
        overlayId,
        runId,
      })
      .mockResolvedValueOnce(null);

    const baseUrl = await startServer(app);

    const client = await connectSse(baseUrl);

    const message = await client.readEvent();

    expect(message).toEqual({
      event: 'access-revoked',
      data: {},
    });

    await client.expectEnd();

    await vi.waitFor(() => {
      expect(overlayEventBus.getSubscriberCount(runId)).toBe(0);
    });
  });

  it('rejects connections at the global limit even when the run has capacity', async () => {
    const { app } = createTestApp();
    const baseUrl = await startServer(app);

    const subscriptions = Array.from(
      { length: OVERLAY_STREAM_CONFIG.maxConnectionsTotal },
      (_, index) => overlayEventBus.subscribe(`capacity-run-${index}`, vi.fn()),
    );

    try {
      expect(overlayEventBus.getSubscriberCount(runId)).toBe(0);

      const response = await fetch(`${baseUrl}/api/obs/overlays/${token}/events`);

      expect(response.status).toBe(503);
      expect(response.headers.get('retry-after')).toBe(
        String(OVERLAY_STREAM_CONFIG.retryAfterSeconds),
      );
      expect(await response.json()).toEqual({
        error: 'OVERLAY_CONNECTION_LIMIT',
      });
    } finally {
      subscriptions.forEach((unsubscribe) => unsubscribe());
    }

    const client = await connectSse(baseUrl);
    expect((await client.readEvent()).event).toBe('connected');
  });

  it('closes active streams during server shutdown', async () => {
    const { app } = createTestApp();
    const baseUrl = await startServer(app);
    const client = await connectSse(baseUrl);

    expect((await client.readEvent()).event).toBe('connected');

    const closing = app.close();
    try {
      await client.expectEnd();
      await closing;
      expect(overlayEventBus.getTotalSubscriberCount()).toBe(0);
    } finally {
      client.close();
      await closing;
      const index = apps.indexOf(app);
      if (index !== -1) apps.splice(index, 1);
    }
  });

  it('revokes only the targeted overlay within the same run', async () => {
    const { app, service } = createTestApp();
    const secondToken = 'c'.repeat(64);
    const secondOverlayId = '990e8400-e29b-41d4-a716-446655440000';

    service.getObsStreamAccess.mockImplementation(async (value: string) =>
      value === secondToken ? { runId, overlayId: secondOverlayId } : { runId, overlayId },
    );

    const baseUrl = await startServer(app);
    const first = await connectSse(baseUrl);
    const second = await connectSse(baseUrl, secondToken);
    await first.readEvent();
    await second.readEvent();

    overlayEventBus.revokeOverlay(runId, overlayId);

    expect(await first.readEvent()).toEqual({ event: 'access-revoked', data: {} });
    await first.expectEnd();
    expect(overlayEventBus.getSubscriberCount(runId)).toBe(1);

    overlayEventBus.publishTeam(runId, 7);
    expect(await second.readEvent()).toEqual({
      event: 'team-published',
      data: { version: 7 },
    });
  });

  it('closes all streams for a deleted run without affecting another run', async () => {
    const { app, service } = createTestApp();
    const otherToken = 'd'.repeat(64);
    service.getObsStreamAccess.mockImplementation(async (value: string) => ({
      overlayId,
      runId: value === otherToken ? otherRunId : runId,
    }));

    const baseUrl = await startServer(app);
    const first = await connectSse(baseUrl);
    const second = await connectSse(baseUrl);
    const other = await connectSse(baseUrl, otherToken);
    await first.readEvent();
    await second.readEvent();
    await other.readEvent();

    overlayEventBus.deleteRun(runId);

    for (const client of [first, second]) {
      expect(await client.readEvent()).toEqual({ event: 'access-revoked', data: {} });
      await client.expectEnd();
    }

    expect(overlayEventBus.getSubscriberCount(runId)).toBe(0);
    expect(overlayEventBus.getSubscriberCount(otherRunId)).toBe(1);
    overlayEventBus.publishTeam(otherRunId, 8);
    expect(await other.readEvent()).toEqual({
      event: 'team-published',
      data: { version: 8 },
    });
  });
});
