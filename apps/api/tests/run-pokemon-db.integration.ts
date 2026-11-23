import 'dotenv/config';

import assert from 'node:assert/strict';

import { createPrismaClient } from '../src/db/prisma.js';

import {
  RunPokemonService,
  TeamSlotOccupiedError,
} from '../src/modules/run-pokemon/run-pokemon.service.js';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  // Esta prueba crea y elimina registros reales.
  // Permitimos ejecutarla solamente contra PostgreSQL local.
  const url = new URL(databaseUrl);

  if (
    process.env.NODE_ENV === 'production' ||
    !['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)
  ) {
    throw new Error('This integration test requires a local PostgreSQL database');
  }

  const prisma = createPrismaClient(databaseUrl);
  const service = new RunPokemonService(prisma);

  let userId: string | null = null;
  let runId: string | null = null;

  try {
    await prisma.$connect();

    const user = await prisma.user.create({
      data: {
        displayName: 'Runvista Integration Test',
      },
    });

    userId = user.id;

    const run = await prisma.run.create({
      data: {
        ownerId: user.id,
        title: 'Temporary Pokemon Integration Test',
      },
    });

    runId = run.id;

    console.log('1. Testing concurrent team slot creation');

    const results = await Promise.allSettled([
      service.create(user.id, run.id, {
        speciesId: 25,
        nickname: 'Pikachu',
        status: 'TEAM',
        teamSlot: 1,
      }),

      service.create(user.id, run.id, {
        speciesId: 658,
        nickname: 'Greninja',
        status: 'TEAM',
        teamSlot: 1,
      }),
    ]);

    const successful = results.filter((result) => result.status === 'fulfilled');

    const failed = results.filter((result) => result.status === 'rejected');

    assert.equal(successful.length, 1, 'Exactly one concurrent creation must succeed');

    assert.equal(failed.length, 1, 'Exactly one concurrent creation must fail');

    const rejected = failed[0];

    assert.ok(rejected && rejected.status === 'rejected');

    assert.ok(
      rejected.reason instanceof TeamSlotOccupiedError,
      'The conflict must be translated correctly',
    );

    const team = await prisma.runPokemon.findMany({
      where: {
        runId: run.id,
        status: 'TEAM',
      },
    });

    assert.equal(team.length, 1);
    assert.equal(team[0]?.teamSlot, 1);

    console.log('   OK: only one Pokemon occupies slot 1');

    console.log('2. Testing movement to box');

    const current = team[0];

    assert.ok(current);

    const moved = await service.move(user.id, run.id, current.id, { status: 'BOX' });

    assert.equal(moved.found, true);

    const boxed = await prisma.runPokemon.findUniqueOrThrow({
      where: {
        id: current.id,
      },
    });

    assert.equal(boxed.status, 'BOX');
    assert.equal(boxed.teamSlot, null);

    console.log('   OK: moving to box releases the slot');

    console.log('3. Testing slot reuse');

    const replacement = await service.create(user.id, run.id, {
      speciesId: 6,
      nickname: 'Charizard',
      status: 'TEAM',
      teamSlot: 1,
    });

    assert.equal(replacement.found, true);

    const finalTeam = await prisma.runPokemon.findMany({
      where: {
        runId: run.id,
        status: 'TEAM',
      },
    });

    assert.equal(finalTeam.length, 1);
    assert.equal(finalTeam[0]?.speciesId, 6);
    assert.equal(finalTeam[0]?.teamSlot, 1);

    console.log('   OK: released slot can be reused');

    console.log('4. Testing owner authorization');

    const inaccessible = await service.list('550e8400-e29b-41d4-a716-446655440000', run.id);

    assert.deepEqual(inaccessible, {
      found: false,
    });

    console.log('   OK: unrelated users cannot read the run');

    console.log('\nAll PostgreSQL integration checks passed.');
  } finally {
    // Eliminamos exclusivamente los registros de esta prueba.
    // Los Pokemon se eliminan en cascada con su partida.
    try {
      if (runId) {
        await prisma.run.delete({
          where: { id: runId },
        });
      }
    } finally {
      try {
        if (userId) {
          await prisma.user.delete({
            where: { id: userId },
          });
        }
      } finally {
        await prisma.$disconnect();
      }
    }
  }
}

main().catch((error: unknown) => {
  console.error('Pokemon integration test failed:', error);
  process.exitCode = 1;
});
