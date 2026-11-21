import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PartyPreview, type PokemonCardData } from '@runvista/ui';

const bulbasaur: PokemonCardData = {
  id: 1,
  species: 'Bulbasaur',
  nickname: 'Verdín',
  level: 24,
  types: ['grass', 'poison'],
  condition: 'active',
};

describe('PartyPreview', () => {
  it('renders six empty slots', () => {
    const html = renderToStaticMarkup(<PartyPreview pokemon={[]} />);

    for (let slot = 1; slot <= 6; slot++) {
      expect(html).toContain(`Ranura ${slot}: vacía`);
    }
  });

  it('preserves empty positions between Pokémon', () => {
    const html = renderToStaticMarkup(<PartyPreview pokemon={[bulbasaur, null, bulbasaur]} />);

    expect(html).toContain('Ranura 1: Verdín');
    expect(html).toContain('Ranura 2: vacía');
    expect(html).toContain('Ranura 3: Verdín');
  });

  it('marks the selected slot as pressed', () => {
    const html = renderToStaticMarkup(
      <PartyPreview pokemon={[bulbasaur]} selectedSlot={1} onSlotSelect={() => {}} />,
    );

    expect(html).toContain('aria-pressed="true"');
  });

  it('does not render more than six slots', () => {
    const html = renderToStaticMarkup(<PartyPreview pokemon={Array(8).fill(null)} />);

    expect(html).toContain('Ranura 6: vacía');
    expect(html).not.toContain('Ranura 7: vacía');
  });
});
