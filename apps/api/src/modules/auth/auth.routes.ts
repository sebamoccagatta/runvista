import type { FastifyPluginAsync } from 'fastify';

import type { AuthLoginService } from './auth.login-service.js';
import { createAuthSessionRoutes, type AuthSessionRoutesOptions } from './auth.session-routes.js';
import type { TwitchConfig } from './twitch.config.js';
import { createTwitchAuthRoutes } from './twitch.routes.js';

export interface AuthRoutesOptions {
  twitchConfig: TwitchConfig;
  loginService: Pick<AuthLoginService, 'completeTwitchLogin'>;
  sessions: AuthSessionRoutesOptions['sessions'];
  allowedOrigins: readonly string[];
  successRedirectUrl?: string;
}

export function createAuthRoutes({
  twitchConfig,
  loginService,
  sessions,
  allowedOrigins,
  successRedirectUrl,
}: AuthRoutesOptions): FastifyPluginAsync {
  return async function authRoutes(app) {
    await app.register(
      createTwitchAuthRoutes({
        config: twitchConfig,
        loginService,

        // No pasamos la propiedad cuando no está definida.
        ...(successRedirectUrl !== undefined ? { successRedirectUrl } : {}),
      }),
    );

    await app.register(
      createAuthSessionRoutes({
        sessions,
        allowedOrigins,
        secureCookies: twitchConfig.redirectUri.startsWith('https://'),
      }),
    );
  };
}
