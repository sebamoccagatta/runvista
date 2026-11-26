import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { isValidOverlayToken } from './overlay-token.js';
import { overlayEventBus } from './overlay-events.js';
import type { RunOverlayService } from './run-overlay.service.js';

import { OVERLAY_STREAM_CONFIG } from './overlay-stream.config.js';
import { createOverlayStream } from './overlay-stream.js';

const overlayParamsSchema = z.strictObject({
  runId: z.uuid(),
  overlayId: z.uuid(),
});

const tokenParamsSchema = z.strictObject({
  token: z.string(),
});

type ObsOperations = Pick<
  RunOverlayService,
  'getObsAccess' | 'issueObsToken' | 'revokeObsToken' | 'getPublicOverlay' | 'getObsStreamAccess'
>;

export interface ObsOverlayRoutesDependencies {
  service: ObsOperations;
  resolveActorId: (request: FastifyRequest) => string | null | Promise<string | null>;
}

export function createObsOverlayAccessRoutes({
  service,
  resolveActorId,
}: ObsOverlayRoutesDependencies): FastifyPluginAsync {
  return async function obsOverlayAccessRoutes(app) {
    app.addHook('preHandler', async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      reply.header('Referrer-Policy', 'no-referrer');

      const actorId = await resolveActorId(request);

      if (!actorId) {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      request.actorId = actorId;
    });

    app.get('/api/runs/:runId/overlays/:overlayId/obs-access', async (request, reply) => {
      const params = overlayParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          error: 'INVALID_OVERLAY_PARAMS',
        });
      }

      const result = await service.getObsAccess(
        request.actorId!,
        params.data.runId,
        params.data.overlayId,
      );

      if (!result.found) {
        return reply.code(404).send({
          error: 'OVERLAY_NOT_FOUND',
        });
      }

      return reply.code(200).send({
        token: result.token,
        hasLegacyAccess: result.hasLegacyAccess,
      });
    });

    app.post('/api/runs/:runId/overlays/:overlayId/obs-access', async (request, reply) => {
      const params = overlayParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          error: 'INVALID_OVERLAY_PARAMS',
        });
      }

      const token = await service.issueObsToken(
        request.actorId!,
        params.data.runId,
        params.data.overlayId,
      );

      if (!token) {
        return reply.code(404).send({
          error: 'OVERLAY_NOT_FOUND',
        });
      }

      // Cierra las conexiones que utilizaban
      // el enlace anterior de este overlay.
      overlayEventBus.revokeOverlay(params.data.runId, params.data.overlayId);

      return reply.code(201).send({ token });
    });

    app.delete('/api/runs/:runId/overlays/:overlayId/obs-access', async (request, reply) => {
      const params = overlayParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          error: 'INVALID_OVERLAY_PARAMS',
        });
      }

      const revoked = await service.revokeObsToken(
        request.actorId!,
        params.data.runId,
        params.data.overlayId,
      );

      if (!revoked) {
        return reply.code(404).send({
          error: 'OVERLAY_NOT_FOUND',
        });
      }

      overlayEventBus.revokeOverlay(params.data.runId, params.data.overlayId);

      return reply.code(204).send();
    });
  };
}

export function createPublicObsOverlayRoutes({
  service,
}: Pick<ObsOverlayRoutesDependencies, 'service'>): FastifyPluginAsync {
  return async function publicObsOverlayRoutes(app) {
    app.addHook('preClose', async () => {
      overlayEventBus.shutdown();
    });

    app.get('/api/obs/overlays/:token', async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      reply.header('Referrer-Policy', 'no-referrer');
      reply.header('X-Content-Type-Options', 'nosniff');

      const params = tokenParamsSchema.safeParse(request.params);

      if (!params.success || !isValidOverlayToken(params.data.token)) {
        return reply.code(404).send({
          error: 'OVERLAY_NOT_FOUND',
        });
      }

      const data = await service.getPublicOverlay(params.data.token);

      if (!data) {
        return reply.code(404).send({
          error: 'OVERLAY_NOT_FOUND',
        });
      }

      return reply.code(200).send(data);
    });

    app.get('/api/obs/overlays/:token/events', async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      reply.header('Referrer-Policy', 'no-referrer');
      reply.header('X-Content-Type-Options', 'nosniff');

      const params = tokenParamsSchema.safeParse(request.params);

      if (!params.success || !isValidOverlayToken(params.data.token)) {
        return reply.code(404).send({
          error: 'OVERLAY_NOT_FOUND',
        });
      }

      const token = params.data.token;

      const access = await service.getObsStreamAccess(token);

      if (!access) {
        return reply.code(404).send({
          error: 'OVERLAY_NOT_FOUND',
        });
      }

      const runConnections = overlayEventBus.getSubscriberCount(access.runId);

      const totalConnections = overlayEventBus.getTotalSubscriberCount();

      if (
        runConnections >= OVERLAY_STREAM_CONFIG.maxConnectionsPerRun ||
        totalConnections >= OVERLAY_STREAM_CONFIG.maxConnectionsTotal
      ) {
        reply.header('Retry-After', String(OVERLAY_STREAM_CONFIG.retryAfterSeconds));

        return reply.code(503).send({
          error: 'OVERLAY_CONNECTION_LIMIT',
        });
      }

      reply.hijack();

      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',

        'Cache-Control': 'no-cache, no-store, no-transform',

        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      });

      const stream = createOverlayStream({
        response: reply.raw,
        runId: access.runId,
        overlayId: access.overlayId,
      });

      try {
        // Volvemos a validar después de suscribirnos.
        // Así reducimos la ventana de carrera entre
        // la autorización inicial y una revocación.
        const confirmedAccess = await service.getObsStreamAccess(token);

        if (stream.isClosed()) {
          return;
        }

        if (
          !confirmedAccess ||
          confirmedAccess.runId !== access.runId ||
          confirmedAccess.overlayId !== access.overlayId
        ) {
          stream.revoke();
          return;
        }

        stream.sendConnected();
      } catch {
        // La respuesta ya es SSE. No podemos
        // devolver un error HTTP convencional.
        stream.close();
      }
    });
  };
}
