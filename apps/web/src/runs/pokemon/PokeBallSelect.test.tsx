/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { PokeBallSelect } from './PokeBallSelect';

afterEach(() => {
  cleanup();
});

describe('PokeBallSelect', () => {
  it('lists the classic balls and an empty option', () => {
    render(<PokeBallSelect id="ball" value={null} onChange={vi.fn()} />);

    const select = screen.getByLabelText('Poké Ball') as HTMLSelectElement;
    const options = Array.from(select.options, (option) => option.textContent);

    expect(options[0]).toBe('Sin Poké Ball');
    expect(options).toContain('Super Ball');
    expect(options).toHaveLength(17);
  });

  it('reports the selected ball key', () => {
    const onChange = vi.fn();
    render(<PokeBallSelect id="ball" value={null} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Poké Ball'), { target: { value: 'great-ball' } });

    expect(onChange).toHaveBeenCalledWith('great-ball');
  });

  it('reports null when the empty option is chosen', () => {
    const onChange = vi.fn();
    render(<PokeBallSelect id="ball" value="great-ball" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Poké Ball'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows the preview image of the selected ball', () => {
    render(<PokeBallSelect id="ball" value="master-ball" onChange={vi.fn()} />);

    const preview = document.querySelector('img');

    expect(preview?.getAttribute('src')).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png',
    );
  });
});
