import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

import {
  runConfigurationParamsSchema,
  saveRunConfigurationSchema,
} from './run-configuration.schemas.js';

import type { RunConfigurationService } from './run-configuration.service.js';

type ConfigurationOperations = Pick<RunConfigurationService, 'getByRunId' | 'save'>;

export interface RunConfigurationRoutesDependencies {
  service: ConfigurationOperations;
  resolveActorId: (request: FastifyRequest) => string | null | Promise<string | null>;
}

export function createRunConfigurationRoutes({
  service,
  resolveActorId,
}: RunConfigurationRoutesDependencies): FastifyPluginAsync {
  return async function runConfigurationRoutes(app) {
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

    app.get('/api/runs/:id/configuration', async (request, reply) => {
      const params = runConfigurationParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          error: 'INVALID_RUN_ID',
        });
      }

      const result = await service.getByRunId(request.actorId!, params.data.id);

      if (!result.found) {
        return reply.code(404).send({
          error: 'RUN_NOT_FOUND',
        });
      }

      return reply.code(200).send({
        configuration: result.configuration,
      });
    });

    app.put('/api/runs/:id/configuration', async (request, reply) => {
      const params = runConfigurationParamsSchema.safeParse(request.params);

      const body = saveRunConfigurationSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          details: [
            ...(!params.success ? params.error.issues : []),
            ...(!body.success ? body.error.issues : []),
          ],
        });
      }

      const configuration = await service.save(request.actorId!, params.data.id, body.data);

      if (!configuration) {
        return reply.code(404).send({
          error: 'RUN_NOT_FOUND',
        });
      }

      return reply.code(200).send({
        configuration,
      });
    });
  };
}
