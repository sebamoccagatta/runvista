/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_OVERLAY_STYLE, cloneOverlayStyle } from '@runvista/overlay-engine';

import { OverlayStyleControls } from './OverlayStyleControls';

afterEach(() => {
  cleanup();
});

function setup(overrides: Partial<Parameters<typeof OverlayStyleControls>[0]> = {}) {
  const onChange = vi.fn();
  const onResetGroup = vi.fn();

  render(
    <OverlayStyleControls
      idPrefix="test"
      style={cloneOverlayStyle(DEFAULT_OVERLAY_STYLE)}
      onChange={onChange}
      onResetGroup={onResetGroup}
      {...overrides}
    />,
  );

  return { onChange, onResetGroup };
}

describe('OverlayStyleControls', () => {
  it('shows the current style values', () => {
    setup();

    expect((screen.getByLabelText('Tamaño del texto') as HTMLInputElement).value).toBe('36');
    expect((screen.getByLabelText('Color del texto') as HTMLInputElement).value).toBe('#ffffff');
    expect((screen.getByLabelText('Opacidad de la ball') as HTMLInputElement).value).toBe('0.85');
    expect((screen.getByLabelText('Tipografía') as HTMLSelectElement).value).toBe('sans');
    expect((screen.getByLabelText('Sombra del texto') as HTMLInputElement).checked).toBe(true);
  });

  it('reports the text size change for the label group', () => {
    const { onChange } = setup();

    fireEvent.change(screen.getByLabelText('Tamaño del texto'), { target: { value: '48' } });

    expect(onChange).toHaveBeenCalledWith('label', { fontSize: 48 });
  });

  it('reports card changes: color, opacity, border and radius', () => {
    const { onChange } = setup();

    fireEvent.change(screen.getByLabelText('Color de fondo'), { target: { value: '#112233' } });
    fireEvent.change(screen.getByLabelText('Opacidad del fondo'), { target: { value: '0.5' } });
    fireEvent.change(screen.getByLabelText('Grosor del borde'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Esquinas redondeadas'), { target: { value: '16' } });

    expect(onChange).toHaveBeenCalledWith('card', { background: '#112233' });
    expect(onChange).toHaveBeenCalledWith('card', { backgroundOpacity: 0.5 });
    expect(onChange).toHaveBeenCalledWith('card', { borderWidth: 4 });
    expect(onChange).toHaveBeenCalledWith('card', { radius: 16 });
  });

  it('reports the font family and shadow toggle', () => {
    const { onChange } = setup();

    fireEvent.change(screen.getByLabelText('Tipografía'), { target: { value: 'serif' } });
    fireEvent.click(screen.getByLabelText('Sombra del texto'));

    expect(onChange).toHaveBeenCalledWith('label', { fontFamily: 'serif' });
    expect(onChange).toHaveBeenCalledWith('label', { shadow: false });
  });

  it('reports ball opacity and scale', () => {
    const { onChange } = setup();

    fireEvent.change(screen.getByLabelText('Opacidad de la ball'), { target: { value: '0.4' } });
    fireEvent.change(screen.getByLabelText('Tamaño de la ball'), { target: { value: '1.3' } });

    expect(onChange).toHaveBeenCalledWith('ball', { opacity: 0.4 });
    expect(onChange).toHaveBeenCalledWith('ball', { scale: 1.3 });
  });

  it('keeps slider values to two decimals', () => {
    const { onChange } = setup();

    fireEvent.change(screen.getByLabelText('Opacidad de la ball'), {
      target: { value: '0.30000000000000004' },
    });

    expect(onChange).toHaveBeenCalledWith('ball', { opacity: 0.3 });
  });

  it('lists the four font families', () => {
    setup();

    const options = Array.from(
      (screen.getByLabelText('Tipografía') as HTMLSelectElement).options,
      (option) => option.value,
    );

    expect(options).toEqual(['sans', 'serif', 'mono', 'rounded']);
  });

  it('does not show reset buttons unless a group is overridden', () => {
    setup();

    expect(screen.queryByRole('button', { name: /Restablecer/ })).toBeNull();
  });

  it('shows a reset button only for overridden groups and reports the group', () => {
    const { onResetGroup } = setup({ overridden: { label: true } });

    expect(screen.getAllByRole('button', { name: /Restablecer/ })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer texto' }));

    expect(onResetGroup).toHaveBeenCalledWith('label');
  });

  it('uses the id prefix so two panels do not clash', () => {
    setup({ idPrefix: 'slot-3' });

    expect(screen.getByLabelText('Tamaño del texto').id).toBe('slot-3-label-size');
  });
});
