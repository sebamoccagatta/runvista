import { describe, expect, it } from 'vitest';

import { resolveServerSecurityConfig } from './server.config.js';

describe('Server security configuration', () => {
  it('uses localhost defaults in development', () => {
    const config = resolveServerSecurityConfig({ NODE_ENV: 'development' }, 3211);

    expect(config.frontendOrigin).toBe('http://localhost:5173');

    expect(config.allowedOrigins).toEqual(['http://localhost:5173', 'http://localhost:3211']);
  });

  it('accepts a custom development origin', () => {
    const config = resolveServerSecurityConfig(
      {
        NODE_ENV: 'development',
        FRONTEND_ORIGIN: 'http://localhost:4173',
      },
      3211,
    );

    expect(config.allowedOrigins).toContain('http://localhost:4173');
  });

  it('requires FRONTEND_ORIGIN in production', () => {
    expect(() => resolveServerSecurityConfig({ NODE_ENV: 'production' }, 3211)).toThrow(
      'FRONTEND_ORIGIN is required in production',
    );
  });

  it('rejects HTTP in production', () => {
    expect(() =>
      resolveServerSecurityConfig(
        {
          NODE_ENV: 'production',
          FRONTEND_ORIGIN: 'http://runvista.example',
        },
        3211,
      ),
    ).toThrow('FRONTEND_ORIGIN must use HTTPS in production');
  });

  it('rejects localhost in production', () => {
    expect(() =>
      resolveServerSecurityConfig(
        {
          NODE_ENV: 'production',
          FRONTEND_ORIGIN: 'https://localhost',
        },
        3211,
      ),
    ).toThrow('FRONTEND_ORIGIN cannot use localhost in production');
  });

  it('does not allow localhost automatically in production', () => {
    const config = resolveServerSecurityConfig(
      {
        NODE_ENV: 'production',
        FRONTEND_ORIGIN: 'https://runvista.example',
      },
      3211,
    );

    expect(config.allowedOrigins).toEqual(['https://runvista.example']);
  });

  it('rejects URLs containing paths', () => {
    expect(() =>
      resolveServerSecurityConfig(
        {
          FRONTEND_ORIGIN: 'https://runvista.example/app',
        },
        3211,
      ),
    ).toThrow('FRONTEND_ORIGIN must be a URL origin');
  });

  it('rejects URLs containing credentials', () => {
    expect(() =>
      resolveServerSecurityConfig(
        {
          FRONTEND_ORIGIN: 'https://user:pass@runvista.example',
        },
        3211,
      ),
    ).toThrow('FRONTEND_ORIGIN must be a URL origin');
  });
});
