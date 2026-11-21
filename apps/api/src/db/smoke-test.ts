import 'dotenv/config';

import { createPrismaClient } from './prisma.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const prisma = createPrismaClient(databaseUrl);

async function main() {
  const rollbackSignal = new Error('ROLLBACK_SMOKE_TEST');

  let createdUserId: string | undefined;
  let createdRunId: string | undefined;

  await prisma.$connect();

  console.log('✓ PostgreSQL conectado');

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          displayName: 'Runvista Smoke Test',
        },
      });

      createdUserId = user.id;

      console.log('✓ Usuario creado');

      const run = await tx.run.create({
        data: {
          title: 'Partida de prueba',
          ownerId: user.id,
        },
      });

      createdRunId = run.id;

      console.log('✓ Partida creada');

      await tx.runParticipant.create({
        data: {
          runId: run.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      console.log('✓ Participante asociado');

      const savedRun = await tx.run.findUnique({
        where: {
          id: run.id,
        },
        include: {
          owner: true,
          participants: true,
        },
      });

      if (
        !savedRun ||
        savedRun.owner.id !== user.id ||
        savedRun.participants.length !== 1 ||
        savedRun.participants[0]?.role !== 'OWNER'
      ) {
        throw new Error('La lectura de la partida falló');
      }

      console.log('✓ Relaciones verificadas');

      // Provoca la reversión de todos los cambios
      // realizados dentro de esta transacción.
      throw rollbackSignal;
    });
  } catch (error) {
    if (error !== rollbackSignal) {
      throw error;
    }

    console.log('✓ Transacción revertida');
  }

  if (!createdUserId || !createdRunId) {
    throw new Error('La prueba no creó los registros esperados');
  }

  const [user, run] = await Promise.all([
    prisma.user.findUnique({
      where: { id: createdUserId },
    }),
    prisma.run.findUnique({
      where: { id: createdRunId },
    }),
  ]);

  if (user !== null || run !== null) {
    throw new Error('La transacción dejó datos persistidos');
  }

  console.log('✓ PostgreSQL sin registros de prueba');
  console.log('✓ Smoke test completado');
}

try {
  await main();
} catch (error) {
  console.error('✗ Smoke test falló:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
