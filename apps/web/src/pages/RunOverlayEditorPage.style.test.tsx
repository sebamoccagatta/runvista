/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_OVERLAY_STYLE, upgradeLayout, type OverlayLayout } from '@runvista/overlay-engine';

import {
  createDefaultOverlayLayout,
  listRunOverlays,
  updateRunOverlay,
  type RunOverlay,
} from '../runs/overlays/overlay.api';
import { listRunPokemon } from '../runs/pokemon/pokemon.api';
import { RunOverlayEditorPage } from './RunOverlayEditorPage';

vi.mock('../runs/overlays/overlay.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../runs/overlays/overlay.api')>();

  return {
    ...actual,
    listRunOverlays: vi.fn(),
    createRunOverlay: vi.fn(),
    updateRunOverlay: vi.fn(),
    deleteRunOverlay: vi.fn(),
  };
});

vi.mock('../runs/pokemon/pokemon.api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../runs/pokemon/pokemon.api')>();

  return { ...actual, listRunPokemon: vi.fn() };
});

vi.mock('../runs/overlays/OverlayAccessActions', () => ({
  OverlayAccessActions: () => null,
}));

const runId = '550e8400-e29b-41d4-a716-446655440000';

function overlayFixture(): RunOverlay {
  return {
    id: '660e8400-e29b-41d4-a716-446655440000',
    runId,
    name: 'Gameplay',
    layout: createDefaultOverlayLayout(),
    createdAt: '2026-11-26T00:00:00.000Z',
    updatedAt: '2026-11-26T00:00:00.000Z',
  };
}

beforeEach(() => {
  const overlay = overlayFixture();

  vi.mocked(listRunOverlays).mockResolvedValue([overlay]);
  vi.mocked(listRunPokemon).mockResolvedValue([]);
  vi.mocked(updateRunOverlay).mockImplementation(async (_runId, id, input) => ({
    ...overlay,
    id,
    layout: input.layout ?? overlay.layout,
  }));
});

afterEach(() => {
  cleanup();
});

async function openEditor() {
  render(
    <MemoryRouter initialEntries={[`/app/runs/${runId}/overlays`]}>
      <Routes>
        <Route path="/app/runs/:id/overlays" element={<RunOverlayEditorPage />} />
      </Routes>
    </MemoryRouter>,
  );

  await screen.findByText('Estilo del equipo');
}

function field(id: string): HTMLInputElement {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Field not found: ${id}`);
  }

  return element as HTMLInputElement;
}

function change(id: string, value: string) {
  fireEvent.change(field(id), { target: { value } });
}

async function savedLayout(): Promise<OverlayLayout> {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar diseño' }));

  await vi.waitFor(() => expect(updateRunOverlay).toHaveBeenCalled());

  const call = vi.mocked(updateRunOverlay).mock.calls.at(-1);
  const layout = call?.[2].layout;

  if (!layout) {
    throw new Error('Expected a layout to be saved');
  }

  return layout;
}

describe('overlay editor: common style', () => {
  it('shows the common style controls with the current values', async () => {
    await openEditor();

    expect(field('common-label-size').value).toBe('36');
    expect(field('common-card-radius').value).toBe('0');
    expect(field('common-ball-scale').value).toBe('1.15');
  });

  it('saves a changed common style', async () => {
    await openEditor();

    change('common-label-size', '48');
    change('common-card-radius', '16');

    const layout = await savedLayout();

    expect(layout.style.label.fontSize).toBe(48);
    expect(layout.style.card.radius).toBe(16);
    expect(layout.style.label.color).toBe(DEFAULT_OVERLAY_STYLE.label.color);
  });

  it('restores the default common style', async () => {
    await openEditor();

    change('common-label-size', '48');
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer estilo' }));

    const layout = await savedLayout();

    expect(layout.style).toEqual(DEFAULT_OVERLAY_STYLE);
  });
});

describe('overlay editor: per-position style', () => {
  it('hides the position controls until the position is customized', async () => {
    await openEditor();

    expect(screen.getByText('Estilo de la posición 1')).toBeTruthy();
    expect(document.getElementById('slot-1-label-size')).toBeNull();

    fireEvent.click(screen.getByLabelText('Personalizar esta posición'));

    expect(document.getElementById('slot-1-label-size')).not.toBeNull();
  });

  it('saves only what the position changes and leaves the others alone', async () => {
    await openEditor();

    fireEvent.click(screen.getByLabelText('Personalizar esta posición'));
    change('slot-1-label-color', '#ff0000');

    const layout = await savedLayout();

    expect(layout.elements[0]?.style).toEqual({ label: { color: '#ff0000' } });
    expect(layout.elements[1]?.style).toBeUndefined();
    expect(layout.style.label.color).toBe(DEFAULT_OVERLAY_STYLE.label.color);
  });

  it('shows the effective values: the common style with the override on top', async () => {
    await openEditor();

    change('common-label-size', '48');
    fireEvent.click(screen.getByLabelText('Personalizar esta posición'));

    expect(field('slot-1-label-size').value).toBe('48');

    change('slot-1-label-size', '60');

    expect(field('slot-1-label-size').value).toBe('60');
    expect(field('common-label-size').value).toBe('48');
  });

  it('resets a single group without touching the others', async () => {
    await openEditor();

    fireEvent.click(screen.getByLabelText('Personalizar esta posición'));
    change('slot-1-label-color', '#ff0000');
    change('slot-1-ball-opacity', '0.4');

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer texto' }));

    const layout = await savedLayout();

    expect(layout.elements[0]?.style).toEqual({ ball: { opacity: 0.4 } });
  });

  it('returns to the common style when the position stops being customized', async () => {
    await openEditor();

    fireEvent.click(screen.getByLabelText('Personalizar esta posición'));
    change('slot-1-label-color', '#ff0000');
    fireEvent.click(screen.getByLabelText('Personalizar esta posición'));

    const layout = await savedLayout();

    expect(layout.elements[0]?.style).toBeUndefined();
  });

  it('edits the position that is selected', async () => {
    await openEditor();

    fireEvent.click(screen.getByRole('button', { name: '3' }));

    expect(screen.getByText('Estilo de la posición 3')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Personalizar esta posición'));
    change('slot-3-card-radius', '24');

    const layout = await savedLayout();

    expect(layout.elements[2]?.style).toEqual({ card: { radius: 24 } });
    expect(layout.elements[0]?.style).toBeUndefined();
  });
});

describe('overlay editor: reset distribution', () => {
  it('restores positions but keeps the common style and the position overrides', async () => {
    await openEditor();

    change('common-label-size', '48');

    fireEvent.click(screen.getByLabelText('Personalizar esta posición'));
    change('slot-1-label-color', '#ff0000');

    fireEvent.change(screen.getByLabelText('Posición X'), { target: { value: '400' } });
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer distribución' }));

    const layout = await savedLayout();

    expect(layout.elements[0]?.x).toBe(120);
    expect(layout.style.label.fontSize).toBe(48);
    expect(layout.elements[0]?.style).toEqual({ label: { color: '#ff0000' } });
  });
});

describe('overlay editor: produces valid layouts', () => {
  it('always saves a layout the server will accept', async () => {
    await openEditor();

    change('common-label-size', '72');
    change('common-card-opacity', '0.5');
    change('common-card-border-width', '4');

    fireEvent.click(screen.getByLabelText('Personalizar esta posición'));
    change('slot-1-ball-scale', '1.4');

    const layout = await savedLayout();

    expect(upgradeLayout(layout)).not.toBeNull();
  });
});
