import 'dotenv/config';

import assert from 'node:assert/strict';

import { DEFAULT_OVERLAY_STYLE } from '@runvista/overlay-engine';

import { createPrismaClient } from '../src/db/prisma.js';

import { createDefaultOverlayLayout } from '../src/modules/run-overlays/run-overlay.schemas.js';

import {
  OverlayNameConflictError,
  RunOverlayService,
} from '../src/modules/run-overlays/run-overlay.service.js';

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
const service = new RunOverlayService(prisma);

const userIds: string[] = [];
const runIds: string[] = [];

function assertNoObsCredentials(overlay: object) {
  assert.equal(Object.hasOwn(overlay, 'obsPublicId'), false);
  assert.equal(Object.hasOwn(overlay, 'obsTokenHash'), false);
}

async function main() {
  console.log('Checking overlay persistence in PostgreSQL...');

  const owner = await prisma.user.create({
    data: {
      displayName: 'Overlay Integration Owner',
    },
  });

  userIds.push(owner.id);

  const stranger = await prisma.user.create({
    data: {
      displayName: 'Overlay Integration Stranger',
    },
  });

  userIds.push(stranger.id);

  const run = await prisma.run.create({
    data: {
      title: 'Overlay Integration Test',
      ownerId: owner.id,
    },
  });

  runIds.push(run.id);

  const layout = createDefaultOverlayLayout();

  const created = await service.create(owner.id, run.id, {
    name: 'Gameplay',
    layout,
  });

  assert.equal(created.found, true);

  if (!created.found) {
    throw new Error('Expected the run to exist');
  }

  const overlayId = created.overlay.id;
  assertNoObsCredentials(created.overlay);

  const token = await service.issueObsToken(owner.id, run.id, overlayId);
  assert.ok(token);

  console.log('✓ Creates an overlay');

  const stored = await prisma.runOverlay.findUniqueOrThrow({
    where: { id: overlayId },
  });

  assert.deepEqual(stored.layout, layout);

  console.log('✓ Persists the complete layout as JSON');

  const listed = await service.list(owner.id, run.id);

  assert.equal(listed.found, true);

  if (!listed.found) {
    throw new Error('Expected the owner to list overlays');
  }

  assert.equal(listed.overlays.length, 1);
  assert.equal(listed.overlays[0]?.id, overlayId);
  for (const overlay of listed.overlays) {
    assertNoObsCredentials(overlay);
  }

  console.log('✓ Lists saved overlays');

  const editedLayout = createDefaultOverlayLayout();

  editedLayout.elements[0]!.x = 420;
  editedLayout.elements[0]!.y = 280;
  editedLayout.elements[0]!.width = 300;
  editedLayout.elements[0]!.height = 250;

  const updated = await service.update(owner.id, run.id, overlayId, {
    name: 'Gameplay Custom',
    layout: editedLayout,
  });

  assert.ok(updated);
  assert.equal(updated.name, 'Gameplay Custom');
  assertNoObsCredentials(updated);

  const reloaded = await service.getById(owner.id, run.id, overlayId);

  assert.ok(reloaded);
  assert.deepEqual(reloaded.layout, editedLayout);
  assertNoObsCredentials(reloaded);

  const access = await service.getObsAccess(owner.id, run.id, overlayId);
  assert.ok(access.found);
  assert.equal(access.token, token);
  assert.ok(await service.getPublicOverlay(token));

  console.log('✓ Excludes OBS credentials from CRUD and preserves dedicated access');

  console.log('✓ Updates and reloads custom positions');

  // Overlays guardados antes de los estilos tienen layout v1 en la base.
  const legacyLayout = {
    version: 1,
    canvas: { width: 1920, height: 1080 },
    elements: Array.from({ length: 6 }, (_, index) => ({
      slot: index + 1,
      x: 120 + index * 280,
      y: 820,
      width: 220,
      height: 190,
      visible: true,
      showNickname: true,
      showSpecies: false,
      showLevel: true,
    })),
  };

  const legacy = await prisma.runOverlay.create({
    data: { runId: run.id, name: 'Legacy v1', layout: legacyLayout },
  });

  const legacyRead = await service.getById(owner.id, run.id, legacy.id);

  assert.ok(legacyRead);
  assert.equal((legacyRead.layout as { version: number }).version, 2);
  assert.deepEqual((legacyRead.layout as { style: unknown }).style, DEFAULT_OVERLAY_STYLE);

  const legacyStored = await prisma.runOverlay.findUniqueOrThrow({ where: { id: legacy.id } });

  assert.equal((legacyStored.layout as { version: number }).version, 1);

  const legacyList = await service.list(owner.id, run.id);

  assert.ok(legacyList.found);

  const legacyListed = legacyList.overlays.find((overlay) => overlay.id === legacy.id);

  assert.equal((legacyListed?.layout as { version: number }).version, 2);

  const legacyToken = await service.issueObsToken(owner.id, run.id, legacy.id);

  assert.ok(legacyToken);

  const legacyPublic = await service.getPublicOverlay(legacyToken);

  assert.ok(legacyPublic);
  assert.equal(legacyPublic.layout.version, 2);

  console.log('✓ Reads layouts stored as version 1 as version 2 without migrating the database');

  const styledLayout = createDefaultOverlayLayout();

  styledLayout.style.label.fontSize = 48;
  styledLayout.style.ball.opacity = 0.6;
  styledLayout.elements[1]!.style = { label: { color: '#ffcc00' }, card: { radius: 16 } };

  const styled = await service.update(owner.id, run.id, legacy.id, { layout: styledLayout });

  assert.ok(styled);
  assert.deepEqual(styled.layout, styledLayout);

  const styledStored = await prisma.runOverlay.findUniqueOrThrow({ where: { id: legacy.id } });

  assert.deepEqual(styledStored.layout, styledLayout);

  console.log('✓ Saves and reloads a version 2 layout with styles and per-slot overrides');

  await prisma.runOverlay.delete({ where: { id: legacy.id } });

  let duplicateRejected = false;

  try {
    await service.create(owner.id, run.id, {
      name: 'Gameplay Custom',
      layout,
    });
  } catch (error) {
    if (!(error instanceof OverlayNameConflictError)) {
      throw error;
    }

    duplicateRejected = true;
  }

  assert.equal(duplicateRejected, true);

  console.log('✓ Rejects duplicate overlay names');

  const strangerList = await service.list(stranger.id, run.id);

  assert.equal(strangerList.found, false);

  const strangerOverlay = await service.getById(stranger.id, run.id, overlayId);

  assert.equal(strangerOverlay, null);

  console.log('✓ Prevents unauthorized reads');

  const unauthorizedUpdate = await service.update(stranger.id, run.id, overlayId, {
    name: 'Unauthorized Change',
  });

  assert.equal(unauthorizedUpdate, null);

  const unauthorizedDelete = await service.remove(stranger.id, run.id, overlayId);

  assert.equal(unauthorizedDelete, false);

  const unchanged = await service.getById(owner.id, run.id, overlayId);

  assert.equal(unchanged?.name, 'Gameplay Custom');

  console.log('✓ Prevents unauthorized modifications');

  const missingRun = await service.create(stranger.id, run.id, {
    name: 'Unauthorized Overlay',
    layout,
  });

  assert.equal(missingRun.found, false);

  console.log('✓ Prevents creating overlays in another run');

  // Verify that deleting a run cascades to its overlays.
  await prisma.run.delete({
    where: { id: run.id },
  });

  runIds.splice(runIds.indexOf(run.id), 1);

  const remaining = await prisma.runOverlay.count({
    where: { id: overlayId },
  });

  assert.equal(remaining, 0);

  console.log('✓ Deletes overlays when their run is deleted');

  console.log('');
  console.log('All overlay integration checks passed.');
}

async function cleanup() {
  for (const runId of runIds) {
    await prisma.run.deleteMany({
      where: { id: runId },
    });
  }

  for (const userId of userIds) {
    await prisma.user.deleteMany({
      where: { id: userId },
    });
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
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
