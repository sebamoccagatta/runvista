import 'dotenv/config';

import assert from 'node:assert/strict';

import { createPrismaClient } from '../../db/prisma.js';
import { RunService } from './run.service.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const prisma = createPrismaClient(databaseUrl);
const service = new RunService(prisma);

async function main() {
  let ownerId: string | undefined;
  let otherUserId: string | undefined;

  await prisma.$connect();

  try {
    const owner = await prisma.user.create({
      data: {
        displayName: 'Runvista Integration Owner',
      },
    });

    ownerId = owner.id;

    const otherUser = await prisma.user.create({
      data: {
        displayName: 'Runvista Integration Other User',
      },
    });

    otherUserId = otherUser.id;

    console.log('✓ Dos usuarios creados');

    const run = await service.create(owner.id, {
      title: 'Pokémon Y Randomlocke',
      description: 'Prueba de permisos',
    });

    assert.equal(run.ownerId, owner.id);
    assert.equal(run.status, 'DRAFT');

    const participant = await prisma.runParticipant.findUnique({
      where: {
        runId_userId: {
          runId: run.id,
          userId: owner.id,
        },
      },
    });

    assert.equal(participant?.role, 'OWNER');

    console.log('✓ Partida y participante creados');

    const ownerRuns = await service.list(owner.id);
    const otherRuns = await service.list(otherUser.id);

    assert(ownerRuns.some((item) => item.id === run.id));
    assert(!otherRuns.some((item) => item.id === run.id));

    console.log('✓ Listado restringido por propietario');

    const visibleToOwner = await service.getById(owner.id, run.id);

    const visibleToOther = await service.getById(otherUser.id, run.id);

    assert.equal(visibleToOwner?.id, run.id);
    assert.equal(visibleToOther, null);

    console.log('✓ Lectura de partida ajena bloqueada');

    const unauthorizedUpdate = await service.update(otherUser.id, run.id, {
      title: 'Modificación no autorizada',
    });

    assert.equal(unauthorizedUpdate, null);

    const unchangedRun = await service.getById(owner.id, run.id);

    assert.equal(unchangedRun?.title, 'Pokémon Y Randomlocke');

    console.log('✓ Modificación ajena bloqueada');

    const unauthorizedDelete = await service.remove(otherUser.id, run.id);

    assert.equal(unauthorizedDelete, false);

    const existingRun = await service.getById(owner.id, run.id);

    assert.equal(existingRun?.id, run.id);

    console.log('✓ Eliminación ajena bloqueada');

    const updated = await service.update(owner.id, run.id, {
      title: 'Randomlocke actualizada',
      status: 'ACTIVE',
    });

    assert.equal(updated?.title, 'Randomlocke actualizada');
    assert.equal(updated?.status, 'ACTIVE');

    console.log('✓ Propietario puede actualizar su partida');

    const removed = await service.remove(owner.id, run.id);

    assert.equal(removed, true);

    const deletedRun = await prisma.run.findUnique({
      where: { id: run.id },
    });

    assert.equal(deletedRun, null);

    const remainingParticipants = await prisma.runParticipant.count({
      where: { runId: run.id },
    });

    assert.equal(remainingParticipants, 0);

    console.log('✓ Eliminación y cascada verificadas');
    console.log('✓ Prueba de integración completada');
  } finally {
    // Limpieza incluso cuando alguna comprobación falla.
    if (ownerId || otherUserId) {
      const userIds = [ownerId, otherUserId].filter((id): id is string => id !== undefined);

      await prisma.run.deleteMany({
        where: { ownerId: { in: userIds } },
      });

      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });

      console.log('✓ Datos temporales eliminados');
    }
  }
}

try {
  await main();
} catch (error) {
  console.error('✗ Integration test failed:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
