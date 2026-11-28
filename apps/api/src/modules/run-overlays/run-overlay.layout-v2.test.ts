import { DEFAULT_OVERLAY_STYLE } from '@runvista/overlay-engine';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '../../generated/prisma/client.js';

import {
  createDefaultOverlayLayout,
  createRunOverlaySchema,
  overlayLayoutSchema,
  updateRunOverlaySchema,
} from './run-overlay.schemas.js';
import { RunOverlayService } from './run-overlay.service.js';

const actorId = '110e8400-e29b-41d4-a716-446655440000';
const runId = '550e8400-e29b-41d4-a716-446655440000';
const overlayId = '660e8400-e29b-41d4-a716-446655440000';
const token = 'a'.repeat(64);

function v1Layout() {
  return {
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
}

function overlayRow(layout: unknown) {
  return {
    id: overlayId,
    runId,
    name: 'Gameplay',
    layout,
    createdAt: new Date('2026-11-26T00:00:00.000Z'),
    updatedAt: new Date('2026-11-26T00:00:00.000Z'),
  };
}

describe('layout schema with versions', () => {
  it('accepts a version 1 layout and produces version 2', () => {
    const result = overlayLayoutSchema.safeParse(v1Layout());

    expect(result.success).toBe(true);
    expect(result.success && result.data.version).toBe(2);
    expect(result.success && result.data.style).toEqual(DEFAULT_OVERLAY_STYLE);
  });

  it('accepts a version 2 layout with per-element styles', () => {
    const layout = createDefaultOverlayLayout();
    layout.style.label.fontSize = 48;
    layout.elements[0]!.style = { label: { color: '#ffcc00' }, ball: { opacity: 0.5 } };

    const result = overlayLayoutSchema.safeParse(layout);

    expect(result.success).toBe(true);
    expect(result.success && result.data.elements[0]?.style?.label?.color).toBe('#ffcc00');
  });

  it('rejects styles outside the shared limits', () => {
    const layout = createDefaultOverlayLayout();
    layout.style.label.fontSize = 500;

    expect(overlayLayoutSchema.safeParse(layout).success).toBe(false);
  });

  it('rejects colors that are not #RRGGBB, including CSS injection attempts', () => {
    const layout = createDefaultOverlayLayout();
    layout.elements[0]!.style = { card: { background: '#000000; background:url(x)' } };

    expect(overlayLayoutSchema.safeParse(layout).success).toBe(false);
  });

  it('rejects unknown properties inside elements', () => {
    const layout = createDefaultOverlayLayout() as unknown as {
      elements: Record<string, unknown>[];
    };
    layout.elements[0]!.html = '<script>';

    expect(overlayLayoutSchema.safeParse(layout).success).toBe(false);
  });

  it('requires a layout when creating an overlay', () => {
    expect(createRunOverlaySchema.safeParse({ name: 'Gameplay' }).success).toBe(false);
  });

  it('accepts a version 1 layout when creating and updating', () => {
    expect(createRunOverlaySchema.safeParse({ name: 'Gameplay', layout: v1Layout() }).success).toBe(
      true,
    );
    expect(updateRunOverlaySchema.safeParse({ layout: v1Layout() }).success).toBe(true);
  });

  it('stores version 2 when a client sends version 1', () => {
    const parsed = createRunOverlaySchema.parse({ name: 'Gameplay', layout: v1Layout() });

    expect(parsed.layout.version).toBe(2);
  });
});

describe('reading stored layouts', () => {
  it('upgrades a stored version 1 layout when listing', async () => {
    const prisma = {
      run: { findFirst: vi.fn().mockResolvedValue({ id: runId }) },
      runOverlay: { findMany: vi.fn().mockResolvedValue([overlayRow(v1Layout())]) },
    } as unknown as PrismaClient;

    const result = await new RunOverlayService(prisma).list(actorId, runId);

    expect(result.found).toBe(true);
    expect(result.found && (result.overlays[0]?.layout as { version: number }).version).toBe(2);
  });

  it('upgrades a stored version 1 layout when fetching one overlay', async () => {
    const prisma = {
      runOverlay: { findFirst: vi.fn().mockResolvedValue(overlayRow(v1Layout())) },
    } as unknown as PrismaClient;

    const overlay = await new RunOverlayService(prisma).getById(actorId, runId, overlayId);

    expect((overlay?.layout as { version: number }).version).toBe(2);
  });

  it('keeps a version 2 layout unchanged when reading', async () => {
    const layout = createDefaultOverlayLayout();
    layout.style.label.fontSize = 48;

    const prisma = {
      runOverlay: { findFirst: vi.fn().mockResolvedValue(overlayRow(layout)) },
    } as unknown as PrismaClient;

    const overlay = await new RunOverlayService(prisma).getById(actorId, runId, overlayId);

    expect((overlay?.layout as typeof layout).style.label.fontSize).toBe(48);
  });

  it('returns a corrupt stored layout unchanged instead of inventing one', async () => {
    const corrupt = { version: 9, whatever: true };

    const prisma = {
      runOverlay: { findFirst: vi.fn().mockResolvedValue(overlayRow(corrupt)) },
    } as unknown as PrismaClient;

    const overlay = await new RunOverlayService(prisma).getById(actorId, runId, overlayId);

    expect(overlay?.layout).toEqual(corrupt);
  });

  it('serves a stored version 1 layout to OBS as version 2', async () => {
    const prisma = {
      runOverlay: {
        findFirst: vi.fn().mockResolvedValue({
          layout: v1Layout(),
          run: { publishedTeam: null },
        }),
      },
    } as unknown as PrismaClient;

    const result = await new RunOverlayService(prisma).getPublicOverlay(token);

    expect(result?.layout.version).toBe(2);
    expect(result?.layout.style).toEqual(DEFAULT_OVERLAY_STYLE);
  });

  it('hides an overlay whose stored layout is corrupt from OBS', async () => {
    const prisma = {
      runOverlay: {
        findFirst: vi.fn().mockResolvedValue({
          layout: { version: 9 },
          run: { publishedTeam: null },
        }),
      },
    } as unknown as PrismaClient;

    expect(await new RunOverlayService(prisma).getPublicOverlay(token)).toBeNull();
  });
});
