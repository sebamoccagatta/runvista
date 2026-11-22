import Fastify from 'fastify';

import { createAuthRoutes, type AuthRoutesOptions } from './modules/auth/auth.routes.js';
import { createRunRoutes, type RunRoutesDependencies } from './modules/runs/run.routes.js';

export interface BuildAppOptions {
  auth?: AuthRoutesOptions;
  runs?: RunRoutesDependencies;
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

      // No registrar query strings: el callback OAuth
      // contiene un código de autorización sensible.
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

  // Protección CSRF para las operaciones de escritura
  // de partidas. Se ejecuta antes de sus handlers.
  app.addHook('onRequest', async (request, reply) => {
    if (!options.runs) {
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

  app.get('/api/health', async () => {
    return {
      status: 'ok',
      service: 'runvista-api',
    };
  });

  if (options.auth) {
    app.register(createAuthRoutes(options.auth));
  }

  if (options.runs) {
    app.register(createRunRoutes(options.runs));
  }

  return app;
}
