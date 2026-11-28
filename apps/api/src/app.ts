import Fastify from 'fastify';

import { createAuthRoutes, type AuthRoutesOptions } from './modules/auth/auth.routes.js';

import { createRunRoutes, type RunRoutesDependencies } from './modules/runs/run.routes.js';

import {
  createRunConfigurationRoutes,
  type RunConfigurationRoutesDependencies,
} from './modules/run-configuration/run-configuration.routes.js';

import {
  createRunBadgeRoutes,
  type RunBadgeRoutesDependencies,
} from './modules/run-badges/run-badge.routes.js';

import {
  createRunPokemonRoutes,
  type RunPokemonRoutesDependencies,
} from './modules/run-pokemon/run-pokemon.routes.js';

import {
  createRunPokemonPublicationRoutes,
  type RunPokemonPublicationRoutesDependencies,
} from './modules/run-pokemon/run-pokemon-publication.routes.js';

import {
  createRunOverlayRoutes,
  type RunOverlayRoutesDependencies,
} from './modules/run-overlays/run-overlay.routes.js';

import {
  createObsOverlayAccessRoutes,
  createPublicObsOverlayRoutes,
  type ObsOverlayRoutesDependencies,
} from './modules/run-overlays/obs-overlay.routes.js';

export interface BuildAppOptions {
  auth?: AuthRoutesOptions;
  runs?: RunRoutesDependencies;
  runConfiguration?: RunConfigurationRoutesDependencies;
  runBadges?: RunBadgeRoutesDependencies;
  runPokemon?: RunPokemonRoutesDependencies;
  pokemonPublication?: RunPokemonPublicationRoutesDependencies;
  runOverlays?: RunOverlayRoutesDependencies;
  obsOverlays?: ObsOverlayRoutesDependencies;
  allowedOrigins?: readonly string[];
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isRunRoute(path: string): boolean {
  return path === '/api/runs' || path.startsWith('/api/runs/');
}

function safeLogPath(url: string): string {
  const path = url.split('?')[0] ?? '';

  if (path.startsWith('/api/obs/overlays/')) {
    return '/api/obs/overlays/[REDACTED]';
  }

  return path;
}

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: {
      level: 'info',

      serializers: {
        req(request) {
          return {
            method: request.method,
            path: safeLogPath(request.url),
          };
        },
      },

      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        censor: '[REDACTED]',
      },
    },
  });

  app.addHook('onRequest', async (request, reply) => {
    if (
      !options.runs &&
      !options.runConfiguration &&
      !options.runBadges &&
      !options.runPokemon &&
      !options.pokemonPublication &&
      !options.runOverlays &&
      !options.obsOverlays
    ) {
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

  if (options.runBadges) {
    app.register(createRunBadgeRoutes(options.runBadges));
  }

  if (options.runPokemon) {
    app.register(createRunPokemonRoutes(options.runPokemon));
  }

  if (options.pokemonPublication) {
    app.register(createRunPokemonPublicationRoutes(options.pokemonPublication));
  }

  if (options.runOverlays) {
    app.register(createRunOverlayRoutes(options.runOverlays));
  }

  if (options.obsOverlays) {
    app.register(createObsOverlayAccessRoutes(options.obsOverlays));

    app.register(createPublicObsOverlayRoutes(options.obsOverlays));
  }

  return app;
}
