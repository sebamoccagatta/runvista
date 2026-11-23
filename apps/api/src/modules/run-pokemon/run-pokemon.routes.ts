import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

import {
  createRunPokemonSchema,
  moveRunPokemonSchema,
  runPokemonIdParamsSchema,
  runPokemonParamsSchema,
  updateRunPokemonSchema,
} from './run-pokemon.schemas.js';

import { TeamSlotOccupiedError, type RunPokemonService } from './run-pokemon.service.js';

type PokemonOperations = Pick<RunPokemonService, 'list' | 'create' | 'update' | 'move'>;

export interface RunPokemonRoutesDependencies {
  service: PokemonOperations;
  resolveActorId: (request: FastifyRequest) => string | null | Promise<string | null>;
}

export function createRunPokemonRoutes({
  service,
  resolveActorId,
}: RunPokemonRoutesDependencies): FastifyPluginAsync {
  return async function runPokemonRoutes(app) {
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

    app.get('/api/runs/:runId/pokemon', async (request, reply) => {
      const params = runPokemonParamsSchema.safeParse(request.params);

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
        pokemon: result.pokemon,
      });
    });

    app.post('/api/runs/:runId/pokemon', async (request, reply) => {
      const params = runPokemonParamsSchema.safeParse(request.params);
      const body = createRunPokemonSchema.safeParse(request.body);

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
          pokemon: result.pokemon,
        });
      } catch (error) {
        if (error instanceof TeamSlotOccupiedError) {
          return reply.code(409).send({
            error: 'TEAM_SLOT_OCCUPIED',
          });
        }

        throw error;
      }
    });

    app.patch('/api/runs/:runId/pokemon/:pokemonId', async (request, reply) => {
      const params = runPokemonIdParamsSchema.safeParse(request.params);
      const body = updateRunPokemonSchema.safeParse(request.body);

      if (!params.success || !body.success) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          details: [
            ...(!params.success ? params.error.issues : []),
            ...(!body.success ? body.error.issues : []),
          ],
        });
      }

      const result = await service.update(
        request.actorId!,
        params.data.runId,
        params.data.pokemonId,
        body.data,
      );

      if (!result.found) {
        return reply.code(404).send({
          error: 'POKEMON_NOT_FOUND',
        });
      }

      return reply.code(200).send({
        pokemon: result.pokemon,
      });
    });

    app.patch('/api/runs/:runId/pokemon/:pokemonId/move', async (request, reply) => {
      const params = runPokemonIdParamsSchema.safeParse(request.params);
      const body = moveRunPokemonSchema.safeParse(request.body);

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
        const result = await service.move(
          request.actorId!,
          params.data.runId,
          params.data.pokemonId,
          body.data,
        );

        if (!result.found) {
          return reply.code(404).send({
            error: 'POKEMON_NOT_FOUND',
          });
        }

        return reply.code(200).send({
          pokemon: result.pokemon,
        });
      } catch (error) {
        if (error instanceof TeamSlotOccupiedError) {
          return reply.code(409).send({
            error: 'TEAM_SLOT_OCCUPIED',
          });
        }

        throw error;
      }
    });
  };
}
