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
import { RunBadgeService } from './modules/run-badges/run-badge.service.js';
import { RunPokemonService } from './modules/run-pokemon/run-pokemon.service.js';
import { RunPokemonPublicationService } from './modules/run-pokemon/run-pokemon-publication.service.js';
import { RunOverlayService } from './modules/run-overlays/run-overlay.service.js';

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
const runBadges = new RunBadgeService(prisma);
const runPokemon = new RunPokemonService(prisma);
const pokemonPublication = new RunPokemonPublicationService(prisma);
const runOverlays = new RunOverlayService(prisma);

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

  runBadges: {
    service: runBadges,
    resolveActorId,
  },

  runPokemon: {
    service: runPokemon,
    resolveActorId,
  },

  pokemonPublication: {
    service: pokemonPublication,
    resolveActorId,
  },

  runOverlays: {
    service: runOverlays,
    resolveActorId,
  },

  obsOverlays: {
    service: runOverlays,
    resolveActorId,
  },
});

app.addHook('onClose', async () => {
  await prisma.$disconnect();
});

const SHUTDOWN_TIMEOUT_MS = 10_000;

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  app.log.info({ signal }, 'Shutting down Runvista API');

  // Si algún cliente retiene la conexión, forzamos la salida
  // para que el proceso no quede colgado indefinidamente.
  setTimeout(() => {
    app.log.error('Forced shutdown after timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  try {
    // Dispara el preClose de overlays: SSE recibe server-shutdown
    // y se cierran las conexiones antes de desconectar la base.
    await app.close();

    process.exit(0);
  } catch (error) {
    app.log.error(error);

    process.exit(1);
  }
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

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
