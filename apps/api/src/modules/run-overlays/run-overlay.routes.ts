import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

import { z } from 'zod';

import { createRunOverlaySchema, updateRunOverlaySchema } from './run-overlay.schemas.js';

import { OverlayNameConflictError, type RunOverlayService } from './run-overlay.service.js';

import { overlayEventBus } from './overlay-events.js';

const runParamsSchema = z.strictObject({
  runId: z.uuid(),
});

const overlayParamsSchema = z.strictObject({
  runId: z.uuid(),
  overlayId: z.uuid(),
});

type OverlayOperations = Pick<
  RunOverlayService,
  'list' | 'getById' | 'create' | 'update' | 'remove'
>;

export interface RunOverlayRoutesDependencies {
  service: OverlayOperations;

  resolveActorId: (request: FastifyRequest) => string | null | Promise<string | null>;
}

export function createRunOverlayRoutes({
  service,
  resolveActorId,
}: RunOverlayRoutesDependencies): FastifyPluginAsync {
  return async function runOverlayRoutes(app) {
    app.addHook('preHandler', async (request, reply) => {
      reply.header('Cache-Control', 'no-store');

      const actorId = await resolveActorId(request);

      if (!actorId) {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      request.actorId = actorId;
    });

    app.get('/api/runs/:runId/overlays', async (request, reply) => {
      const params = runParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          error: 'INVALID_RUN_ID',
        });
      }

      const result = await service.list(request.actorId!, params.data.runId);

      if (!result.found) {
        return reply.code(404).send({
          error: 'RUN_NOT_FOUND',
        });
      }

      return reply.code(200).send({
        overlays: result.overlays,
      });
    });

    app.post('/api/runs/:runId/overlays', async (request, reply) => {
      const params = runParamsSchema.safeParse(request.params);
      const body = createRunOverlaySchema.safeParse(request.body);

      if (!params.success || !body.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          details: [
            ...(!params.success ? params.error.issues : []),
            ...(!body.success ? body.error.issues : []),
          ],
        });
      }

      try {
        const result = await service.create(request.actorId!, params.data.runId, body.data);

        if (!result.found) {
          return reply.code(404).send({
            error: 'RUN_NOT_FOUND',
          });
        }

        return reply.code(201).send({
          overlay: result.overlay,
        });
      } catch (error) {
        if (error instanceof OverlayNameConflictError) {
          return reply.code(409).send({
            error: 'OVERLAY_NAME_CONFLICT',
          });
        }

        throw error;
      }
    });

    app.get('/api/runs/:runId/overlays/:overlayId', async (request, reply) => {
      const params = overlayParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          error: 'INVALID_OVERLAY_PARAMS',
        });
      }

      const overlay = await service.getById(
        request.actorId!,
        params.data.runId,
        params.data.overlayId,
      );

      if (!overlay) {
        return reply.code(404).send({
          error: 'OVERLAY_NOT_FOUND',
        });
      }

      return reply.code(200).send({ overlay });
    });

    app.patch('/api/runs/:runId/overlays/:overlayId', async (request, reply) => {
      const params = overlayParamsSchema.safeParse(request.params);

      const body = updateRunOverlaySchema.safeParse(request.body);

      if (!params.success || !body.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          details: [
            ...(!params.success ? params.error.issues : []),
            ...(!body.success ? body.error.issues : []),
          ],
        });
      }

      try {
        const overlay = await service.update(
          request.actorId!,
          params.data.runId,
          params.data.overlayId,
          body.data,
        );

        if (!overlay) {
          return reply.code(404).send({
            error: 'OVERLAY_NOT_FOUND',
          });
        }

        return reply.code(200).send({ overlay });
      } catch (error) {
        if (error instanceof OverlayNameConflictError) {
          return reply.code(409).send({
            error: 'OVERLAY_NAME_CONFLICT',
          });
        }

        throw error;
      }
    });

    app.delete('/api/runs/:runId/overlays/:overlayId', async (request, reply) => {
      const params = overlayParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          error: 'INVALID_OVERLAY_PARAMS',
        });
      }

      const removed = await service.remove(
        request.actorId!,
        params.data.runId,
        params.data.overlayId,
      );

      if (!removed) {
        return reply.code(404).send({
          error: 'OVERLAY_NOT_FOUND',
        });
      }

      overlayEventBus.revokeOverlay(params.data.runId, params.data.overlayId);

      return reply.code(204).send();
    });
  };
}
