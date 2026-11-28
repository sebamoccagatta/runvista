/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RunApiError } from '../api/runs.api';
import { getRunBadges, setRunBadge, type RunBadge, type RunBadgesState } from './badges.api';
import { RunBadgesPanel } from './RunBadgesPanel';

vi.mock('./badges.api', () => ({
  getRunBadges: vi.fn(),
  setRunBadge: vi.fn(),
}));

const runId = '550e8400-e29b-41d4-a716-446655440000';

function badge(overrides: Partial<RunBadge> = {}): RunBadge {
  return {
    key: 'kanto-boulder',
    region: 'kanto',
    name: 'Medalla Roca',
    leader: 'Brock',
    colors: { primary: '#9e8f7a', secondary: '#5d4b3a' },
    levelCap: 16,
    obtained: false,
    obtainedAt: null,
    ...overrides,
  };
}

function configured(badges: RunBadge[]): RunBadgesState {
  return { configured: true, gameId: 'red', levelCapIncrease: 10, badges };
}

beforeEach(() => {
  vi.mocked(getRunBadges).mockResolvedValue(configured([badge()]));
  vi.mocked(setRunBadge).mockResolvedValue({ obtainedAt: '2026-11-28T12:00:00.000Z' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RunBadgesPanel', () => {
  it('asks for a configuration when the run has none', async () => {
    vi.mocked(getRunBadges).mockResolvedValue({ configured: false, badges: [] });

    render(<RunBadgesPanel runId={runId} />);

    expect(
      await screen.findByText(/Elegí el juego de la partida en la configuración/),
    ).toBeTruthy();
  });

  it('says when the game has no badges yet', async () => {
    vi.mocked(getRunBadges).mockResolvedValue(configured([]));

    render(<RunBadgesPanel runId={runId} />);

    expect(await screen.findByText('Este juego todavía no tiene medallas cargadas.')).toBeTruthy();
  });

  it('shows each badge with its level cap, named only for screen readers', async () => {
    render(<RunBadgesPanel runId={runId} />);

    const button = await screen.findByRole('button', {
      name: 'Medalla Roca, líder Brock, tope Nv. 16',
    });

    expect(button.textContent).toContain('Nv. 16');
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('marks a badge as obtained and sends it to the API', async () => {
    render(<RunBadgesPanel runId={runId} />);

    const button = await screen.findByRole('button', { name: /Medalla Roca/ });

    fireEvent.click(button);

    await waitFor(() => {
      expect(setRunBadge).toHaveBeenCalledWith(runId, 'kanto-boulder', true);
    });

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Todas las medallas de este juego están marcadas.')).toBeTruthy();
  });

  it('reverts the badge and explains the error when saving fails', async () => {
    vi.mocked(setRunBadge).mockRejectedValue(new RunApiError('Server error', 500));

    render(<RunBadgesPanel runId={runId} />);

    const button = await screen.findByRole('button', { name: /Medalla Roca/ });

    fireEvent.click(button);

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'No pudimos guardar la medalla. Intentá nuevamente.',
    );
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('does not title the group when the game has a single region', async () => {
    render(<RunBadgesPanel runId={runId} />);

    await screen.findByRole('button', { name: /Medalla Roca/ });

    expect(screen.queryByRole('heading', { level: 4 })).toBeNull();
  });

  it('groups the badges by region, in order, when the game has two', async () => {
    vi.mocked(getRunBadges).mockResolvedValue(
      configured([
        badge({ key: 'johto-zephyr', region: 'johto', name: 'Medalla Céfiro', leader: 'Falkner' }),
        badge({ key: 'kanto-boulder', region: 'kanto', name: 'Medalla Roca', leader: 'Brock' }),
      ]),
    );

    render(<RunBadgesPanel runId={runId} />);

    await screen.findByRole('button', { name: /Medalla Céfiro/ });

    const titles = screen.getAllByRole('heading', { level: 4 }).map((item) => item.textContent);

    expect(titles).toEqual(['Johto', 'Kanto']);
  });

  it('asks to sign in when the session has expired', async () => {
    vi.mocked(getRunBadges).mockRejectedValue(new RunApiError('Unauthorized', 401));

    render(<RunBadgesPanel runId={runId} />);

    expect(await screen.findByText('Necesitás iniciar sesión para ver las medallas.')).toBeTruthy();
  });
});
