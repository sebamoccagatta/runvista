import { describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '../../generated/prisma/client.js';

import { createDefaultOverlayLayout } from './run-overlay.schemas.js';
import { RunOverlayService } from './run-overlay.service.js';
import { hashOverlayToken } from './overlay-token.js';

const token = 'a'.repeat(64);

const publishedPokemon = {
  speciesId: 6,
  pokemonId: null,
  nickname: 'Charizard publicado',
  level: 50,
  isShiny: false,
  teamSlot: 1,
};

function createService(overlay: unknown) {
  const findFirst = vi.fn().mockResolvedValue(overlay);

  const prisma = {
    runOverlay: {
      findFirst,
    },
  } as unknown as PrismaClient;

  return {
    service: new RunOverlayService(prisma),
    findFirst,
  };
}

describe('Public OBS overlay publication', () => {
  it('shows no Pokemon before the first publication', async () => {
    const { service } = createService({
      layout: createDefaultOverlayLayout(),
      run: {
        publishedTeam: null,
      },
    });

    const result = await service.getPublicOverlay(token);

    expect(result).not.toBeNull();
    expect(result?.pokemon).toEqual([]);
  });

  it('returns the last published team', async () => {
    const { service } = createService({
      layout: createDefaultOverlayLayout(),
      run: {
        publishedTeam: {
          team: [publishedPokemon],
        },
      },
    });

    const result = await service.getPublicOverlay(token);

    expect(result?.pokemon).toEqual([publishedPokemon]);
  });

  it('does not query the live RunPokemon team', async () => {
    const { service, findFirst } = createService({
      layout: createDefaultOverlayLayout(),
      run: {
        publishedTeam: {
          team: [publishedPokemon],
        },
      },
    });

    await service.getPublicOverlay(token);

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ obsPublicId: token }, { obsTokenHash: hashOverlayToken(token) }],
      },
      select: {
        layout: true,
        run: {
          select: {
            publishedTeam: {
              select: {
                team: true,
              },
            },
          },
        },
      },
    });
  });

  it('accepts a valid persistent public identifier', async () => {
    const { service } = createService({
      layout: createDefaultOverlayLayout(),
      run: {
        publishedTeam: {
          team: [publishedPokemon],
        },
      },
    });

    const result = await service.getPublicOverlay(token);

    expect(result).not.toBeNull();
    expect(result?.pokemon).toHaveLength(1);
  });

  it('accepts an existing legacy token', async () => {
    const { service, findFirst } = createService({
      layout: createDefaultOverlayLayout(),
      run: {
        publishedTeam: {
          team: [publishedPokemon],
        },
      },
    });

    const result = await service.getPublicOverlay(token);

    expect(result?.pokemon).toEqual([publishedPokemon]);

    const query = findFirst.mock.calls[0]?.[0];

    expect(query?.where?.OR).toContainEqual({
      obsTokenHash: hashOverlayToken(token),
    });
  });

  it('rejects invalid persisted publication data', async () => {
    const { service } = createService({
      layout: createDefaultOverlayLayout(),
      run: {
        publishedTeam: {
          team: [
            {
              ...publishedPokemon,
              teamSlot: 10,
            },
          ],
        },
      },
    });

    const result = await service.getPublicOverlay(token);

    expect(result).toBeNull();
  });

  it('rejects published teams with duplicated slots', async () => {
    const { service } = createService({
      layout: createDefaultOverlayLayout(),
      run: {
        publishedTeam: {
          team: [
            publishedPokemon,
            {
              ...publishedPokemon,
              speciesId: 25,
            },
          ],
        },
      },
    });

    const result = await service.getPublicOverlay(token);

    expect(result).toBeNull();
  });

  it('rejects an invalid overlay layout', async () => {
    const { service } = createService({
      layout: {
        version: 999,
        canvas: {
          width: 1920,
          height: 1080,
        },
        elements: [],
      },
      run: {
        publishedTeam: {
          team: [publishedPokemon],
        },
      },
    });

    const result = await service.getPublicOverlay(token);

    expect(result).toBeNull();
  });

  it('rejects invalid tokens without querying the database', async () => {
    const { service, findFirst } = createService(null);

    const result = await service.getPublicOverlay('invalid');

    expect(result).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('rejects revoked or unknown tokens', async () => {
    const { service } = createService(null);

    const result = await service.getPublicOverlay(token);

    expect(result).toBeNull();
  });
});
