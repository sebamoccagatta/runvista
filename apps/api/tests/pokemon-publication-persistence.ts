import 'dotenv/config';

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createPrismaClient } from '../src/db/prisma.js';

import { RunPokemonService } from '../src/modules/run-pokemon/run-pokemon.service.js';

import { RunPokemonPublicationService } from '../src/modules/run-pokemon/run-pokemon-publication.service.js';

import { RunOverlayService } from '../src/modules/run-overlays/run-overlay.service.js';

import { createDefaultOverlayLayout } from '../src/modules/run-overlays/run-overlay.schemas.js';

import { hashOverlayToken } from '../src/modules/run-overlays/overlay-token.js';

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

const pokemonService = new RunPokemonService(prisma);

const publicationService = new RunPokemonPublicationService(prisma);

const overlayService = new RunOverlayService(prisma);

const ownerId = randomUUID();
const otherUserId = randomUUID();
const runId = randomUUID();

async function check(name: string, test: () => Promise<void>) {
  await test();
  console.log(`✓ ${name}`);
}

async function run() {
  await prisma.$connect();

  await prisma.user.createMany({
    data: [
      {
        id: ownerId,
        displayName: 'OBS Integration Owner',
      },
      {
        id: otherUserId,
        displayName: 'OBS Integration Other User',
      },
    ],
  });

  await prisma.run.create({
    data: {
      id: runId,
      title: 'OBS publication integration test',
      ownerId,
      status: 'ACTIVE',
    },
  });

  const layout = createDefaultOverlayLayout();

  const firstOverlay = await prisma.runOverlay.create({
    data: {
      runId,
      name: 'Integration overlay A',
      layout,
    },
  });

  const secondOverlay = await prisma.runOverlay.create({
    data: {
      runId,
      name: 'Integration overlay B',
      layout: {
        ...layout,
        elements: layout.elements.map((element) => ({
          ...element,
          y: 600,
        })),
      },
    },
  });

  const firstToken = await overlayService.issueObsToken(ownerId, runId, firstOverlay.id);

  const secondToken = await overlayService.issueObsToken(ownerId, runId, secondOverlay.id);

  assert.ok(firstToken);
  assert.ok(secondToken);
  assert.notEqual(firstToken, secondToken);

  const charizard = await pokemonService.create(ownerId, runId, {
    speciesId: 6,
    nickname: 'Charizard original',
    level: 50,
    isShiny: false,
    pokeBall: 'ultra-ball',
    status: 'TEAM',
    teamSlot: 1,
  });

  assert.ok(charizard.found);

  const greninja = await pokemonService.create(ownerId, runId, {
    speciesId: 658,
    nickname: 'Greninja',
    level: 45,
    isShiny: false,
    status: 'BOX',
  });

  assert.ok(greninja.found);

  await check('Does not show live Pokemon before the first publication', async () => {
    const result = await overlayService.getPublicOverlay(firstToken);

    assert.ok(result);
    assert.deepEqual(result.pokemon, []);

    const status = await publicationService.getStatus(ownerId, runId);

    assert.ok(status.found);
    assert.equal(status.publication, null);
  });

  await check('Rejects unauthorized publications', async () => {
    const result = await publicationService.publish(otherUserId, runId);

    assert.equal(result.found, false);

    const persisted = await prisma.runPublishedTeam.findUnique({
      where: { runId },
    });

    assert.equal(persisted, null);
  });

  await check('Publishes the first team snapshot', async () => {
    const result = await publicationService.publish(ownerId, runId);

    assert.ok(result.found);
    assert.equal(result.publication.version, 1);
    assert.equal(result.publication.pokemon.length, 1);
    assert.equal(result.publication.pokemon[0]?.nickname, 'Charizard original');
    assert.equal(result.publication.pokemon[0]?.pokeBall, 'ultra-ball');

    const persisted = await prisma.runPublishedTeam.findUnique({
      where: { runId },
    });

    assert.ok(persisted);
    assert.equal(persisted.version, 1);
  });

  await check('Shares the published team across multiple overlays', async () => {
    const first = await overlayService.getPublicOverlay(firstToken);

    const second = await overlayService.getPublicOverlay(secondToken);

    assert.ok(first);
    assert.ok(second);

    assert.deepEqual(first.pokemon, second.pokemon);
    assert.notDeepEqual(first.layout, second.layout);
  });

  await check('Editing a Pokemon does not change the published snapshot', async () => {
    const updated = await pokemonService.update(ownerId, runId, charizard.pokemon.id, {
      nickname: 'Charizard modificado',
      level: 70,
      isShiny: true,
      pokeBall: 'master-ball',
    });

    assert.ok(updated.found);

    const result = await overlayService.getPublicOverlay(firstToken);

    assert.ok(result);
    assert.equal(result.pokemon[0]?.nickname, 'Charizard original');
    assert.equal(result.pokemon[0]?.pokeBall, 'ultra-ball');

    assert.equal(result.pokemon[0]?.level, 50);
    assert.equal(result.pokemon[0]?.isShiny, false);
  });

  await check('Moving Pokemon does not change the published team', async () => {
    const removed = await pokemonService.move(ownerId, runId, charizard.pokemon.id, {
      status: 'BOX',
    });

    assert.ok(removed.found);

    const added = await pokemonService.move(ownerId, runId, greninja.pokemon.id, {
      status: 'TEAM',
      teamSlot: 1,
    });

    assert.ok(added.found);

    const result = await overlayService.getPublicOverlay(firstToken);

    assert.ok(result);
    assert.equal(result.pokemon.length, 1);
    assert.equal(result.pokemon[0]?.speciesId, 6);
  });

  await check('Publishes changes only after an explicit publication', async () => {
    const result = await publicationService.publish(ownerId, runId);

    assert.ok(result.found);
    assert.equal(result.publication.version, 2);

    const first = await overlayService.getPublicOverlay(firstToken);

    const second = await overlayService.getPublicOverlay(secondToken);

    assert.ok(first);
    assert.ok(second);

    assert.equal(first.pokemon[0]?.speciesId, 658);
    assert.equal(second.pokemon[0]?.speciesId, 658);
    assert.equal(first.pokemon.length, 1);
  });

  await check('Recovers the published team with a new database client', async () => {
    const freshPrisma = createPrismaClient(databaseUrl!);

    try {
      await freshPrisma.$connect();

      const freshService = new RunOverlayService(freshPrisma);

      const result = await freshService.getPublicOverlay(firstToken);

      assert.ok(result);
      assert.equal(result.pokemon[0]?.speciesId, 658);

      const access = await freshService.getObsAccess(ownerId, runId, firstOverlay.id);

      assert.ok(access.found);
      assert.equal(access.token, firstToken);
    } finally {
      await freshPrisma.$disconnect();
    }
  });

  await check('Prevents other users from recovering overlay links', async () => {
    const result = await overlayService.getObsAccess(otherUserId, runId, firstOverlay.id);

    assert.equal(result.found, false);
  });

  await check('Supports legacy links stored as token hashes', async () => {
    await prisma.runOverlay.update({
      where: { id: firstOverlay.id },
      data: {
        obsPublicId: null,
        obsTokenHash: hashOverlayToken(firstToken),
      },
    });

    const result = await overlayService.getPublicOverlay(firstToken);

    assert.ok(result);

    const access = await overlayService.getObsAccess(ownerId, runId, firstOverlay.id);

    assert.ok(access.found);
    assert.equal(access.token, null);
    assert.equal(access.hasLegacyAccess, true);
  });

  let renewedToken: string | null = null;

  await check('Renews legacy links and invalidates the previous token', async () => {
    renewedToken = await overlayService.issueObsToken(ownerId, runId, firstOverlay.id);

    assert.ok(renewedToken);
    assert.notEqual(renewedToken, firstToken);

    assert.equal(await overlayService.getPublicOverlay(firstToken), null);

    assert.ok(await overlayService.getPublicOverlay(renewedToken));
  });

  await check('Revokes an overlay without affecting other overlays', async () => {
    assert.ok(renewedToken);

    const revoked = await overlayService.revokeObsToken(ownerId, runId, firstOverlay.id);

    assert.equal(revoked, true);

    assert.equal(await overlayService.getPublicOverlay(renewedToken), null);

    assert.ok(await overlayService.getPublicOverlay(secondToken));
  });

  await check('Supports publishing an empty team', async () => {
    const moved = await pokemonService.move(ownerId, runId, greninja.pokemon.id, {
      status: 'BOX',
    });

    assert.ok(moved.found);

    const publication = await publicationService.publish(ownerId, runId);

    assert.ok(publication.found);
    assert.equal(publication.publication.version, 3);
    assert.deepEqual(publication.publication.pokemon, []);

    const result = await overlayService.getPublicOverlay(secondToken);

    assert.ok(result);
    assert.deepEqual(result.pokemon, []);
  });

  await check('Deletes published snapshots when the run is deleted', async () => {
    await prisma.run.delete({
      where: { id: runId },
    });

    const publication = await prisma.runPublishedTeam.findUnique({
      where: { runId },
    });

    assert.equal(publication, null);

    assert.equal(await overlayService.getPublicOverlay(secondToken), null);
  });

  console.log('');
  console.log('All publication integration checks passed.');
}

try {
  await run();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  try {
    await prisma.run.deleteMany({
      where: { id: runId },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [ownerId, otherUserId],
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
