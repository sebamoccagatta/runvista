import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createPrismaClient } from '../../db/prisma.js';
import { AuthSessionService } from './auth.session-service.js';
import { hashSessionToken } from './auth.session.js';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const url = new URL(databaseUrl);

  // Esta prueba crea y elimina registros.
  // Solo permitimos ejecutarla contra el entorno local conocido.
  if (
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    url.port !== '5434' ||
    url.pathname !== '/runvista_adm'
  ) {
    throw new Error('Integration test requires local Runvista PostgreSQL');
  }

  const prisma = createPrismaClient(databaseUrl);
  const sessionService = new AuthSessionService(prisma);

  let userId: string | undefined;

  try {
    await prisma.$connect();
    console.log('✓ PostgreSQL conectado');

    const user = await prisma.user.create({
      data: {
        displayName: 'Runvista Session Integration',
        twitchId: `integration-${randomUUID()}`,
      },
    });

    userId = user.id;
    console.log('✓ Usuario temporal creado');

    const token = await sessionService.create(user.id);

    assert.match(token, /^[a-f0-9]{64}$/);

    const persisted = await prisma.session.findUnique({
      where: {
        tokenHash: hashSessionToken(token),
      },
    });

    assert.ok(persisted);
    assert.equal(persisted.userId, user.id);
    assert.notEqual(persisted.tokenHash, token);
    assert.equal(persisted.revokedAt, null);

    console.log('✓ Sesión persistida con hash');

    const resolved = await sessionService.resolveUser(token);

    assert.ok(resolved);
    assert.equal(resolved.id, user.id);
    assert.equal(resolved.twitchId, user.twitchId);

    console.log('✓ Usuario recuperado desde la sesión');

    const invalid = await sessionService.resolveUser('invalid');
    assert.equal(invalid, null);

    console.log('✓ Token inválido rechazado');

    const revoked = await sessionService.revoke(token);
    assert.equal(revoked, true);

    const afterRevoke = await sessionService.resolveUser(token);

    assert.equal(afterRevoke, null);

    console.log('✓ Sesión revocada y rechazada');

    const revokedAgain = await sessionService.revoke(token);
    assert.equal(revokedAgain, false);

    console.log('✓ Segunda revocación rechazada');

    const expiredToken = await sessionService.create(user.id);

    await prisma.session.update({
      where: {
        tokenHash: hashSessionToken(expiredToken),
      },
      data: {
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const expiredUser = await sessionService.resolveUser(expiredToken);

    assert.equal(expiredUser, null);

    console.log('✓ Sesión expirada rechazada');

    console.log('\nIntegración de sesiones completada correctamente.');
  } finally {
    if (userId) {
      await prisma.user.delete({
        where: { id: userId },
      });

      console.log('✓ Datos temporales eliminados');
    }

    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    'Error en integración de sesiones:',
    error instanceof Error ? error.message : 'Unknown error',
  );

  process.exitCode = 1;
});
