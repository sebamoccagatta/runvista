import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import App from './App';

function renderRoute(path: string) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App routing', () => {
  it('renders the landing page at /', () => {
    const html = renderRoute('/');

    expect(html).toContain('Cada aventura');
    expect(html).toContain('merece ser vista.');
    expect(html).toContain('Tu equipo Pokémon');
  });

  it('renders the dashboard at /app', () => {
    const html = renderRoute('/app');

    expect(html).toContain('Mis partidas');
    expect(html).toContain('Tu próxima aventura comienza acá');
  });

  it('renders the 404 page for unknown routes', () => {
    const html = renderRoute('/ruta-inexistente');

    expect(html).toContain('Error 404');
    expect(html).toContain('Esta ruta se perdió.');
    expect(html).toContain('Volver al inicio');
  });

  it('renders the shared navigation', () => {
    const html = renderRoute('/');

    expect(html).toContain('Navegación principal');
    expect(html).toContain('href="/app"');
    expect(html).toContain('href="/"');
  });
});
