import Fastify from 'fastify';

import { createAuthRoutes, type AuthRoutesOptions } from './modules/auth/auth.routes.js';

import { createRunRoutes, type RunRoutesDependencies } from './modules/runs/run.routes.js';

import {
  createRunConfigurationRoutes,
  type RunConfigurationRoutesDependencies,
} from './modules/run-configuration/run-configuration.routes.js';

import {
  createRunPokemonRoutes,
  type RunPokemonRoutesDependencies,
} from './modules/run-pokemon/run-pokemon.routes.js';

export interface BuildAppOptions {
  auth?: AuthRoutesOptions;
  runs?: RunRoutesDependencies;
  runConfiguration?: RunConfigurationRoutesDependencies;
  runPokemon?: RunPokemonRoutesDependencies;
  allowedOrigins?: readonly string[];
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isRunRoute(path: string): boolean {
  return path === '/api/runs' || path.startsWith('/api/runs/');
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: {
      level: 'info',

      serializers: {
        req(request) {
          return {
            method: request.method,
            path: request.url.split('?')[0],
          };
        },
      },

      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        censor: '[REDACTED]',
      },
    },
  });

  // Protección CSRF para todas las escrituras
  // de partidas, configuraciones y Pokémon.
  app.addHook('onRequest', async (request, reply) => {
    if (!options.runs && !options.runConfiguration && !options.runPokemon) {
      return;
    }

    const path = request.url.split('?')[0] ?? '';

    if (!isRunRoute(path) || !WRITE_METHODS.has(request.method)) {
      return;
    }

    const origin = request.headers.origin;

    if (!origin || !options.allowedOrigins?.includes(origin)) {
      return reply.code(403).send({
        error: 'INVALID_REQUEST_ORIGIN',
      });
    }
  });

  app.get('/api/health', async () => ({
    status: 'ok',
    service: 'runvista-api',
  }));

  if (options.auth) {
    app.register(createAuthRoutes(options.auth));
  }

  if (options.runs) {
    app.register(createRunRoutes(options.runs));
  }

  if (options.runConfiguration) {
    app.register(createRunConfigurationRoutes(options.runConfiguration));
  }

  if (options.runPokemon) {
    app.register(createRunPokemonRoutes(options.runPokemon));
  }

  return app;
}
