import 'dotenv/config';

import assert from 'node:assert/strict';

import { createPrismaClient } from '../src/db/prisma.js';
import { RunBadgeService } from '../src/modules/run-badges/run-badge.service.js';
import { RunConfigurationService } from '../src/modules/run-configuration/run-configuration.service.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const database = new URL(databaseUrl);

if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1'].includes(database.hostname)
) {
  throw new Error('Integration tests must run against a local database');
}

const prisma = createPrismaClient(databaseUrl);
const badges = new RunBadgeService(prisma);
const configuration = new RunConfigurationService(prisma);

const userIds: string[] = [];
const runIds: string[] = [];

async function main() {
  console.log('Checking run badges in PostgreSQL...');

  const owner = await prisma.user.create({ data: { displayName: 'Badge Integration Owner' } });
  userIds.push(owner.id);

  const stranger = await prisma.user.create({
    data: { displayName: 'Badge Integration Stranger' },
  });
  userIds.push(stranger.id);

  const run = await prisma.run.create({
    data: { title: 'Badge Integration Test', ownerId: owner.id },
  });
  runIds.push(run.id);

  const withoutConfig = await badges.getBadges(owner.id, run.id);

  assert.deepEqual(withoutConfig, { found: true, configured: false });

  console.log('✓ A run without configuration offers no badges');

  assert.equal(
    await badges.setBadge(owner.id, run.id, 'kanto-boulder', true).then((r) => r.status),
    'CONFIGURATION_REQUIRED',
  );

  console.log('✓ Marking a badge needs a configuration first');

  await configuration.save(owner.id, run.id, { gameId: 'red', challengeType: 'NUZLOCKE' });

  const stored = await prisma.runConfiguration.findUniqueOrThrow({ where: { runId: run.id } });

  assert.equal(stored.levelCapIncrease, 0);

  console.log('✓ A new configuration starts without level increase');

  await configuration.save(owner.id, run.id, {
    gameId: 'red',
    challengeType: 'NUZLOCKE',
    levelCapIncrease: 10,
  });

  const withIncrease = await badges.getBadges(owner.id, run.id);

  assert.equal(withIncrease.found && withIncrease.configured, true);

  if (!withIncrease.found || !withIncrease.configured) {
    throw new Error('Expected a configured run');
  }

  const caps = Object.fromEntries(withIncrease.badges.map((badge) => [badge.key, badge.levelCap]));

  assert.equal(caps['kanto-boulder'], 16);
  assert.equal(caps['kanto-earth'], 55);

  console.log('✓ Applies the level increase to every level cap, rounding up');

  await configuration.save(owner.id, run.id, { gameId: 'red', challengeType: 'NUZLOCKE' });

  const kept = await prisma.runConfiguration.findUniqueOrThrow({ where: { runId: run.id } });

  assert.equal(kept.levelCapIncrease, 10);

  console.log('✓ Saving without the increase keeps the current value');

  const first = await badges.setBadge(owner.id, run.id, 'kanto-boulder', true);

  assert.equal(first.status, 'OK');

  if (first.status !== 'OK') {
    throw new Error('Expected the badge to be stored');
  }

  const second = await badges.setBadge(owner.id, run.id, 'kanto-boulder', true);

  assert.equal(second.status, 'OK');

  if (second.status !== 'OK') {
    throw new Error('Expected the badge to be stored');
  }

  assert.equal(second.obtainedAt?.getTime(), first.obtainedAt?.getTime());

  const rows = await prisma.runBadge.count({ where: { runId: run.id } });

  assert.equal(rows, 1);

  console.log('✓ Marking a badge twice keeps a single record with its first date');

  await badges.setBadge(owner.id, run.id, 'kanto-boulder', false);

  assert.equal(await prisma.runBadge.count({ where: { runId: run.id } }), 0);

  console.log('✓ Unmarking a badge removes it');

  const unknown = await badges.setBadge(owner.id, run.id, 'johto-zephyr', true);

  assert.equal(unknown.status, 'BADGE_NOT_AVAILABLE');

  console.log('✓ Rejects a badge that the game does not have');

  const foreign = await badges.setBadge(stranger.id, run.id, 'kanto-boulder', true);

  assert.equal(foreign.status, 'RUN_NOT_FOUND');

  const foreignRead = await badges.getBadges(stranger.id, run.id);

  assert.deepEqual(foreignRead, { found: false });

  console.log('✓ Prevents other users from reading or changing badges');

  await badges.setBadge(owner.id, run.id, 'kanto-earth', true);

  await prisma.run.delete({ where: { id: run.id } });
  runIds.splice(runIds.indexOf(run.id), 1);

  assert.equal(await prisma.runBadge.count({ where: { runId: run.id } }), 0);

  console.log('✓ Deleting the run deletes its badges');
}

async function cleanup() {
  for (const runId of runIds) {
    await prisma.run.deleteMany({ where: { id: runId } });
  }

  for (const userId of userIds) {
    await prisma.user.deleteMany({ where: { id: userId } });
  }
}

async function run() {
  let failure: unknown;

  try {
    await main();
  } catch (error) {
    failure = error;
  }

  try {
    await cleanup();
  } catch (error) {
    failure ??= error;
    console.error('Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }

  if (failure) {
    throw failure;
  }

  console.log('\nAll run badge integration checks passed.');
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
