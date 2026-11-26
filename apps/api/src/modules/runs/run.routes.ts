import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

import { createRunSchema, runIdParamsSchema, updateRunSchema } from './run.schemas.js';

import { overlayEventBus } from '../run-overlays/overlay-events.js';

import type { RunService } from './run.service.js';

type RunOperations = Pick<RunService, 'create' | 'list' | 'getById' | 'update' | 'remove'>;

export interface RunRoutesDependencies {
  service: RunOperations;

  resolveActorId: (request: FastifyRequest) => string | null | Promise<string | null>;
}

export function createRunRoutes({
  service,
  resolveActorId,
}: RunRoutesDependencies): FastifyPluginAsync {
  return async function runRoutes(app) {
    app.addHook('preHandler', async (request, reply) => {
      const actorId = await resolveActorId(request);

      if (!actorId) {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      request.actorId = actorId;
    });

    app.post('/api/runs', async (request, reply) => {
      const parsed = createRunSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          details: parsed.error.issues,
        });
      }

      const run = await service.create(request.actorId!, parsed.data);

      return reply.code(201).send(run);
    });

    app.get('/api/runs', async (request) => {
      return service.list(request.actorId!);
    });

    app.get('/api/runs/:id', async (request, reply) => {
      const parsed = runIdParamsSchema.safeParse(request.params);

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'INVALID_RUN_ID',
        });
      }

      const run = await service.getById(request.actorId!, parsed.data.id);

      if (!run) {
        return reply.code(404).send({
          error: 'RUN_NOT_FOUND',
        });
      }

      return run;
    });

    app.patch('/api/runs/:id', async (request, reply) => {
      const params = runIdParamsSchema.safeParse(request.params);
      const body = updateRunSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
        });
      }

      const run = await service.update(request.actorId!, params.data.id, body.data);

      if (!run) {
        return reply.code(404).send({
          error: 'RUN_NOT_FOUND',
        });
      }

      return run;
    });

    app.delete('/api/runs/:id', async (request, reply) => {
      const parsed = runIdParamsSchema.safeParse(request.params);

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'INVALID_RUN_ID',
        });
      }

      const removed = await service.remove(request.actorId!, parsed.data.id);

      if (!removed) {
        return reply.code(404).send({
          error: 'RUN_NOT_FOUND',
        });
      }

      // Invalidar todos los overlays conectados
      // después de eliminar correctamente la partida.
      overlayEventBus.deleteRun(parsed.data.id);

      return reply.code(204).send();
    });
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    actorId?: string;
  }
}
