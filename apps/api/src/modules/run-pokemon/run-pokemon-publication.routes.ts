import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

import { z } from 'zod';

import type { RunPokemonPublicationService } from './run-pokemon-publication.service.js';

import { overlayEventBus } from '../run-overlays/overlay-events.js';

const paramsSchema = z.strictObject({
  runId: z.uuid(),
});

type PublicationOperations = Pick<RunPokemonPublicationService, 'getStatus' | 'publish'>;

export interface RunPokemonPublicationRoutesDependencies {
  service: PublicationOperations;
  resolveActorId: (request: FastifyRequest) => string | null | Promise<string | null>;
}

function isTransactionConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034';
}

export function createRunPokemonPublicationRoutes({
  service,
  resolveActorId,
}: RunPokemonPublicationRoutesDependencies): FastifyPluginAsync {
  return async function publicationRoutes(app) {
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

    app.get('/api/runs/:runId/pokemon/publication', async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          error: 'INVALID_RUN_ID',
        });
      }

      const result = await service.getStatus(request.actorId!, params.data.runId);

      if (!result.found) {
        return reply.code(404).send({
          error: 'RUN_NOT_FOUND',
        });
      }

      return reply.code(200).send({
        publication: result.publication,
      });
    });

    app.post('/api/runs/:runId/pokemon/publish', async (request, reply) => {
      const params = paramsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          error: 'INVALID_RUN_ID',
        });
      }

      try {
        const result = await service.publish(request.actorId!, params.data.runId);

        if (!result.found) {
          return reply.code(404).send({
            error: 'RUN_NOT_FOUND',
          });
        }

        overlayEventBus.publishTeam(params.data.runId, result.publication.version);

        return reply.code(200).send({
          publication: result.publication,
        });
      } catch (error) {
        if (isTransactionConflict(error)) {
          return reply.code(409).send({
            error: 'PUBLICATION_CONFLICT',
            message: 'Retry the publication',
          });
        }

        throw error;
      }
    });
  };
}
