import { createHmac, timingSafeEqual } from 'node:crypto';

import cookie from '@fastify/cookie';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import type { AuthLoginService } from './auth.login-service.js';
import { SESSION_COOKIE_NAME, SESSION_DURATION_MS } from './auth.session.js';
import type { TwitchConfig } from './twitch.config.js';
import { buildTwitchAuthorizationUrl } from './twitch.oauth.js';
import { TwitchOAuthStateStore } from './twitch.state-store.js';

export const TWITCH_STATE_COOKIE = 'runvista_twitch_state';

const statePattern = /^[a-f0-9]{64}$/;

const callbackQuerySchema = z.object({
  state: z.string().regex(statePattern),
  code: z.string().min(1).optional(),
  error: z.string().optional(),
});

export interface TwitchAuthRoutesOptions {
  config: TwitchConfig;
  loginService?: Pick<AuthLoginService, 'completeTwitchLogin'>;
  successRedirectUrl?: string;
}

function isMatchingState(receivedState: string, expectedState: string | undefined): boolean {
  if (!expectedState || !statePattern.test(receivedState) || !statePattern.test(expectedState)) {
    return false;
  }

  return timingSafeEqual(Buffer.from(receivedState, 'hex'), Buffer.from(expectedState, 'hex'));
}

function validateRedirectUrl(redirectUrl: string | undefined): string | undefined {
  if (!redirectUrl) {
    return undefined;
  }

  const parsed = new URL(redirectUrl);

  const isLocalhost = parsed.hostname === 'localhost';

  if (parsed.protocol !== 'https:' && !(isLocalhost && parsed.protocol === 'http:')) {
    throw new Error('Invalid authentication redirect URL');
  }

  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('Invalid authentication redirect URL');
  }

  return parsed.toString();
}

export function createTwitchAuthRoutes({
  config,
  loginService,
  successRedirectUrl,
}: TwitchAuthRoutesOptions): FastifyPluginAsync {
  const stateStore = new TwitchOAuthStateStore();

  const secureCookies = config.redirectUri.startsWith('https://');

  const safeRedirectUrl = validateRedirectUrl(successRedirectUrl);

  const cookieSigningKey = createHmac('sha256', config.clientSecret)
    .update('runvista:oauth-state-cookie:v1')
    .digest('hex');

  return async function twitchAuthRoutes(app) {
    await app.register(cookie, {
      secret: cookieSigningKey,
    });

    app.get('/api/auth/twitch/login', async (_request, reply) => {
      const state = stateStore.issue();

      reply.header('Cache-Control', 'no-store');

      reply.setCookie(TWITCH_STATE_COOKIE, state, {
        httpOnly: true,
        secure: secureCookies,
        sameSite: 'lax',
        signed: true,
        path: '/api/auth/twitch',
        maxAge: 600,
      });

      return reply.redirect(buildTwitchAuthorizationUrl(config, state));
    });

    app.get('/api/auth/twitch/callback', async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      reply.header('Referrer-Policy', 'no-referrer');

      const parsed = callbackQuerySchema.safeParse(request.query);
      const signedCookie = request.cookies[TWITCH_STATE_COOKIE];

      reply.clearCookie(TWITCH_STATE_COOKIE, {
        path: '/api/auth/twitch',
      });

      if (!parsed.success || !signedCookie) {
        return reply.code(400).send({
          error: 'INVALID_OAUTH_STATE',
          message: 'Invalid or expired authentication request',
        });
      }

      const unsignedCookie = request.unsignCookie(signedCookie);

      if (
        !unsignedCookie.valid ||
        !isMatchingState(parsed.data.state, unsignedCookie.value) ||
        !stateStore.consume(parsed.data.state)
      ) {
        return reply.code(400).send({
          error: 'INVALID_OAUTH_STATE',
          message: 'Invalid or expired authentication request',
        });
      }

      if (parsed.data.error) {
        return reply.code(403).send({
          error: 'TWITCH_AUTHORIZATION_DENIED',
          message: 'Twitch authorization was not completed',
        });
      }

      if (!parsed.data.code) {
        return reply.code(400).send({
          error: 'MISSING_AUTHORIZATION_CODE',
        });
      }

      if (!loginService) {
        return reply.code(501).send({
          error: 'AUTHENTICATION_NOT_CONFIGURED',
          message: 'OAuth login service is not configured yet',
        });
      }

      try {
        const { user, sessionToken } = await loginService.completeTwitchLogin(parsed.data.code);

        reply.setCookie(SESSION_COOKIE_NAME, sessionToken, {
          httpOnly: true,
          secure: secureCookies,
          sameSite: 'lax',
          path: '/',
          maxAge: SESSION_DURATION_MS / 1000,
        });

        // Producción: volver al frontend.
        // Nunca incluimos el token en la URL.
        if (safeRedirectUrl) {
          return reply.redirect(safeRedirectUrl, 302);
        }

        // Compatibilidad con las pruebas HTTP existentes.
        return reply.code(200).send({ user });
      } catch {
        return reply.code(503).send({
          error: 'AUTHENTICATION_FAILED',
          message: 'Authentication could not be completed',
        });
      }
    });
  };
}
