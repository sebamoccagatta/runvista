import { NavLink, Outlet } from 'react-router';

const navigation = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/app', label: 'Mis partidas', end: false },
];

export function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-text-primary">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-canvas/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-18 max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-3">
          <NavLink
            to="/"
            className="text-2xl font-black tracking-tight"
            aria-label="Runvista — Inicio"
          >
            Run<span className="text-brand">vista</span>
          </NavLink>

          <nav aria-label="Navegación principal">
            <div className="flex flex-wrap items-center gap-2">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'rounded-xl px-4 py-2 text-sm font-semibold',
                      'transition-colors focus-visible:outline-2',
                      'focus-visible:outline-offset-2 focus-visible:outline-accent',
                      isActive
                        ? 'bg-brand/15 text-brand'
                        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </header>

      <div className="flex-1">
        <Outlet />
      </div>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-text-secondary">
          <span>Runvista — Tu aventura Pokémon, en directo.</span>
          <span>Plataforma en desarrollo</span>
        </div>
      </footer>
    </div>
  );
}
