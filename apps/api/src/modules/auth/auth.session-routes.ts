import cookie from '@fastify/cookie';
import type { FastifyPluginAsync } from 'fastify';

import type { AuthSessionService } from './auth.session-service.js';
import { SESSION_COOKIE_NAME } from './auth.session.js';

export interface AuthSessionRoutesOptions {
  sessions: Pick<AuthSessionService, 'resolveUser' | 'revoke'>;
  allowedOrigins: readonly string[];
  secureCookies: boolean;
}

export function createAuthSessionRoutes({
  sessions,
  allowedOrigins,
  secureCookies,
}: AuthSessionRoutesOptions): FastifyPluginAsync {
  return async function authSessionRoutes(app) {
    await app.register(cookie);

    app.get('/api/auth/me', async (request, reply) => {
      reply.header('Cache-Control', 'no-store');

      const token = request.cookies[SESSION_COOKIE_NAME];

      try {
        const user = await sessions.resolveUser(token);

        if (!user) {
          return reply.code(401).send({
            error: 'UNAUTHENTICATED',
          });
        }

        return reply.code(200).send({ user });
      } catch {
        return reply.code(503).send({
          error: 'SESSION_UNAVAILABLE',
        });
      }
    });

    app.post('/api/auth/logout', async (request, reply) => {
      reply.header('Cache-Control', 'no-store');

      // Rechazamos solicitudes sin un Origin permitido.
      // No aceptamos coincidencias parciales ni comodines.
      const origin = request.headers.origin;

      if (!origin || !allowedOrigins.includes(origin)) {
        return reply.code(403).send({
          error: 'INVALID_REQUEST_ORIGIN',
        });
      }

      const token = request.cookies[SESSION_COOKIE_NAME];

      try {
        if (token) {
          await sessions.revoke(token);
        }

        reply.clearCookie(SESSION_COOKIE_NAME, {
          path: '/',
          httpOnly: true,
          secure: secureCookies,
          sameSite: 'lax',
        });

        // Logout idempotente: también funciona
        // cuando la sesión ya expiró o fue revocada.
        return reply.code(204).send();
      } catch {
        // Si PostgreSQL falla, no afirmamos
        // que la sesión quedó revocada.
        return reply.code(503).send({
          error: 'SESSION_UNAVAILABLE',
        });
      }
    });
  };
}
