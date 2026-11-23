import 'dotenv/config';

import type { FastifyRequest } from 'fastify';

import { buildApp } from './app.js';
import { createPrismaClient } from './db/prisma.js';
import { resolveServerSecurityConfig } from './server.config.js';

import { AuthLoginService } from './modules/auth/auth.login-service.js';
import { AuthSessionService } from './modules/auth/auth.session-service.js';
import { SESSION_COOKIE_NAME, isValidSessionToken } from './modules/auth/auth.session.js';
import { AuthUserService } from './modules/auth/auth.user-service.js';
import { TwitchAuthService } from './modules/auth/twitch.auth-service.js';
import { parseTwitchConfig } from './modules/auth/twitch.config.js';

import { RunService } from './modules/runs/run.service.js';
import { RunConfigurationService } from './modules/run-configuration/run-configuration.service.js';
import { RunPokemonService } from './modules/run-pokemon/run-pokemon.service.js';

function extractSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');

    if (separator === -1) {
      continue;
    }

    const name = part.slice(0, separator).trim();

    if (name !== SESSION_COOKIE_NAME) {
      continue;
    }

    const token = part.slice(separator + 1).trim();

    return isValidSessionToken(token) ? token : null;
  }

  return null;
}

const port = Number(process.env.PORT ?? 3211);
const host = process.env.HOST ?? '127.0.0.1';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port');
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to start Runvista API');
}

const twitchConfig = parseTwitchConfig(process.env);

const { frontendOrigin, allowedOrigins } = resolveServerSecurityConfig(process.env, port);

if (process.env.NODE_ENV === 'production' && !twitchConfig.redirectUri.startsWith('https://')) {
  throw new Error('TWITCH_REDIRECT_URI must use HTTPS in production');
}

const prisma = createPrismaClient(databaseUrl);

const twitchAuth = new TwitchAuthService(twitchConfig);
const authUsers = new AuthUserService(prisma);
const sessions = new AuthSessionService(prisma);

const loginService = new AuthLoginService(twitchAuth, authUsers, sessions);

const runs = new RunService(prisma);
const runConfiguration = new RunConfigurationService(prisma);
const runPokemon = new RunPokemonService(prisma);

async function resolveActorId(request: FastifyRequest): Promise<string | null> {
  const token = extractSessionToken(request.headers.cookie);

  const user = await sessions.resolveUser(token);

  return user?.id ?? null;
}

const app = buildApp({
  allowedOrigins,

  auth: {
    twitchConfig,
    loginService,
    sessions,
    allowedOrigins,
    successRedirectUrl: `${frontendOrigin}/app`,
  },

  runs: {
    service: runs,
    resolveActorId,
  },

  runConfiguration: {
    service: runConfiguration,
    resolveActorId,
  },

  runPokemon: {
    service: runPokemon,
    resolveActorId,
  },
});

app.addHook('onClose', async () => {
  await prisma.$disconnect();
});

try {
  await prisma.$connect();

  app.log.info('PostgreSQL connection established');

  await app.listen({
    port,
    host,
  });
} catch (error) {
  app.log.error(error);

  await app.close();

  process.exitCode = 1;
}
