import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

import {
  runBadgeParamsSchema,
  setRunBadgeBodySchema,
  setRunBadgeParamsSchema,
} from './run-badge.schemas.js';

import type { RunBadgeService } from './run-badge.service.js';

type BadgeOperations = Pick<RunBadgeService, 'getBadges' | 'setBadge'>;

export interface RunBadgeRoutesDependencies {
  service: BadgeOperations;
  resolveActorId: (request: FastifyRequest) => string | null | Promise<string | null>;
}

export function createRunBadgeRoutes({
  service,
  resolveActorId,
}: RunBadgeRoutesDependencies): FastifyPluginAsync {
  return async function runBadgeRoutes(app) {
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

    app.get('/api/runs/:id/badges', async (request, reply) => {
      const params = runBadgeParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          error: 'INVALID_RUN_ID',
        });
      }

      const result = await service.getBadges(request.actorId!, params.data.id);

      if (!result.found) {
        return reply.code(404).send({
          error: 'RUN_NOT_FOUND',
        });
      }

      if (!result.configured) {
        return reply.code(200).send({
          configured: false,
          badges: [],
        });
      }

      return reply.code(200).send({
        configured: true,
        gameId: result.gameId,
        levelCapIncrease: result.levelCapIncrease,
        badges: result.badges,
      });
    });

    app.put('/api/runs/:id/badges/:key', async (request, reply) => {
      const params = setRunBadgeParamsSchema.safeParse(request.params);
      const body = setRunBadgeBodySchema.safeParse(request.body);

      if (!params.success || !body.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          details: [
            ...(!params.success ? params.error.issues : []),
            ...(!body.success ? body.error.issues : []),
          ],
        });
      }

      const result = await service.setBadge(
        request.actorId!,
        params.data.id,
        params.data.key,
        body.data.obtained,
      );

      switch (result.status) {
        case 'RUN_NOT_FOUND':
          return reply.code(404).send({ error: 'RUN_NOT_FOUND' });
        case 'CONFIGURATION_REQUIRED':
          return reply.code(409).send({ error: 'CONFIGURATION_REQUIRED' });
        case 'BADGE_NOT_AVAILABLE':
          return reply.code(422).send({ error: 'BADGE_NOT_AVAILABLE' });
        case 'OK':
          return reply.code(200).send({
            key: params.data.key,
            obtained: result.obtained,
            obtainedAt: result.obtainedAt,
          });
      }
    });
  };
}
