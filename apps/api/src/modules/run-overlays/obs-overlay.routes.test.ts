import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp } from '../../app.js';
import { createDefaultOverlayLayout } from './run-overlay.schemas.js';

const actorId = '550e8400-e29b-41d4-a716-446655440000';
const runId = '660e8400-e29b-41d4-a716-446655440000';
const overlayId = '770e8400-e29b-41d4-a716-446655440000';

const origin = 'http://localhost:5173';
const token = 'a'.repeat(64);

const apps: ReturnType<typeof buildApp>[] = [];

function createTestApp(authenticated = true) {
  const service = {
    getObsAccess: vi.fn().mockResolvedValue({
      found: true,
      token,
      hasLegacyAccess: false,
    }),

    getObsStreamAccess: vi.fn().mockResolvedValue({
      overlayId,
      runId,
    }),

    issueObsToken: vi.fn().mockResolvedValue(token),

    revokeObsToken: vi.fn().mockResolvedValue(true),

    getPublicOverlay: vi.fn().mockResolvedValue({
      layout: createDefaultOverlayLayout(),
      pokemon: [
        {
          speciesId: 6,
          pokemonId: null,
          nickname: 'Chorizard',
          level: 50,
          isShiny: true,
          teamSlot: 1,
        },
      ],
    }),
  };

  const app = buildApp({
    allowedOrigins: [origin],
    obsOverlays: {
      service,
      resolveActorId: () => (authenticated ? actorId : null),
    },
  });

  apps.push(app);

  return { app, service };
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('OBS overlay access routes', () => {
  const accessPath = `/api/runs/${runId}/overlays/${overlayId}/obs-access`;

  describe('GET /obs-access', () => {
    it('recovers an existing OBS link for its owner', async () => {
      const { app, service } = createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: accessPath,
      });

      expect(response.statusCode).toBe(200);

      expect(response.json()).toEqual({
        token,
        hasLegacyAccess: false,
      });

      expect(service.getObsAccess).toHaveBeenCalledWith(actorId, runId, overlayId);

      expect(response.headers['cache-control']).toBe('no-store');
    });

    it('requires authentication to recover the OBS link', async () => {
      const { app, service } = createTestApp(false);

      const response = await app.inject({
        method: 'GET',
        url: accessPath,
      });

      expect(response.statusCode).toBe(401);
      expect(service.getObsAccess).not.toHaveBeenCalled();
    });

    it('returns null when no OBS link exists', async () => {
      const { app, service } = createTestApp();

      service.getObsAccess.mockResolvedValueOnce({
        found: true,
        token: null,
        hasLegacyAccess: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: accessPath,
      });

      expect(response.statusCode).toBe(200);

      expect(response.json()).toEqual({
        token: null,
        hasLegacyAccess: false,
      });
    });

    it('identifies legacy links that cannot be recovered', async () => {
      const { app, service } = createTestApp();

      service.getObsAccess.mockResolvedValueOnce({
        found: true,
        token: null,
        hasLegacyAccess: true,
      });

      const response = await app.inject({
        method: 'GET',
        url: accessPath,
      });

      expect(response.statusCode).toBe(200);

      expect(response.json()).toEqual({
        token: null,
        hasLegacyAccess: true,
      });
    });

    it('does not expose inaccessible overlays', async () => {
      const { app, service } = createTestApp();

      service.getObsAccess.mockResolvedValueOnce({
        found: false,
      });

      const response = await app.inject({
        method: 'GET',
        url: accessPath,
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error).toBe('OVERLAY_NOT_FOUND');
    });

    it('rejects malformed overlay identifiers', async () => {
      const { app, service } = createTestApp();

      const response = await app.inject({
        method: 'GET',
        url: `/api/runs/${runId}/overlays/invalid/obs-access`,
      });

      expect(response.statusCode).toBe(400);
      expect(service.getObsAccess).not.toHaveBeenCalled();
    });
  });

  describe('POST /obs-access', () => {
    it('requires authentication to generate a token', async () => {
      const { app, service } = createTestApp(false);

      const response = await app.inject({
        method: 'POST',
        url: accessPath,
        headers: { origin },
      });

      expect(response.statusCode).toBe(401);
      expect(service.issueObsToken).not.toHaveBeenCalled();
    });

    it('requires a trusted Origin for writes', async () => {
      const { app, service } = createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: accessPath,
      });

      expect(response.statusCode).toBe(403);
      expect(service.issueObsToken).not.toHaveBeenCalled();
    });

    it('generates a token for an accessible overlay', async () => {
      const { app, service } = createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: accessPath,
        headers: { origin },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({ token });
      expect(response.headers['cache-control']).toBe('no-store');

      expect(service.issueObsToken).toHaveBeenCalledWith(actorId, runId, overlayId);
    });

    it('does not generate tokens for inaccessible overlays', async () => {
      const { app, service } = createTestApp();

      service.issueObsToken.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'POST',
        url: accessPath,
        headers: { origin },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json().error).toBe('OVERLAY_NOT_FOUND');
    });

    it('rejects malformed overlay identifiers', async () => {
      const { app, service } = createTestApp();

      const response = await app.inject({
        method: 'POST',
        url: `/api/runs/${runId}/overlays/invalid/obs-access`,
        headers: { origin },
      });

      expect(response.statusCode).toBe(400);
      expect(service.issueObsToken).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /obs-access', () => {
    it('revokes an existing token', async () => {
      const { app, service } = createTestApp();

      const response = await app.inject({
        method: 'DELETE',
        url: accessPath,
        headers: { origin },
      });

      expect(response.statusCode).toBe(204);

      expect(service.revokeObsToken).toHaveBeenCalledWith(actorId, runId, overlayId);
    });

    it('requires authentication to revoke access', async () => {
      const { app, service } = createTestApp(false);

      const response = await app.inject({
        method: 'DELETE',
        url: accessPath,
        headers: { origin },
      });

      expect(response.statusCode).toBe(401);
      expect(service.revokeObsToken).not.toHaveBeenCalled();
    });

    it('requires a trusted Origin to revoke access', async () => {
      const { app, service } = createTestApp();

      const response = await app.inject({
        method: 'DELETE',
        url: accessPath,
      });

      expect(response.statusCode).toBe(403);
      expect(service.revokeObsToken).not.toHaveBeenCalled();
    });

    it('does not revoke inaccessible overlays', async () => {
      const { app, service } = createTestApp();

      service.revokeObsToken.mockResolvedValueOnce(false);

      const response = await app.inject({
        method: 'DELETE',
        url: accessPath,
        headers: { origin },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/obs/overlays/:token', () => {
    it('allows reading a valid overlay without authentication', async () => {
      const { app, service } = createTestApp(false);

      const response = await app.inject({
        method: 'GET',
        url: `/api/obs/overlays/${token}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['referrer-policy']).toBe('no-referrer');

      expect(response.json().pokemon[0].nickname).toBe('Chorizard');
      expect(service.getPublicOverlay).toHaveBeenCalledWith(token);
    });

    it('returns only rendering data', async () => {
      const { app } = createTestApp(false);

      const response = await app.inject({
        method: 'GET',
        url: `/api/obs/overlays/${token}`,
      });

      const body = response.json();

      expect(Object.keys(body).sort()).toEqual(['layout', 'pokemon']);

      expect(Object.keys(body.pokemon[0]).sort()).toEqual([
        'isShiny',
        'level',
        'nickname',
        'pokemonId',
        'speciesId',
        'teamSlot',
      ]);
    });

    it('rejects malformed public tokens', async () => {
      const { app, service } = createTestApp(false);

      const response = await app.inject({
        method: 'GET',
        url: '/api/obs/overlays/invalid',
      });

      expect(response.statusCode).toBe(404);
      expect(service.getPublicOverlay).not.toHaveBeenCalled();
    });

    it('rejects revoked or unknown tokens', async () => {
      const { app, service } = createTestApp(false);

      service.getPublicOverlay.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'GET',
        url: `/api/obs/overlays/${token}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
