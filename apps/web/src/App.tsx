import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  StatusIndicator,
  PokemonTypeBadge,
  POKEMON_TYPES,
} from '@runvista/ui';

import { PokemonCardShowcase } from './components/PokemonCardShowcase';

import { PartyPreviewShowcase } from './components/PartyPreviewShowcase';

type HealthResponse = {
  status: 'ok';
  service: string;
};

type ConnectionState =
  { status: 'connecting' } | { status: 'online'; service: string } | { status: 'offline' };

function App() {
  const [connection, setConnection] = useState<ConnectionState>({
    status: 'connecting',
  });

  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function checkConnection() {
      try {
        const response = await fetch('/api/health', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('API unavailable');
        }

        const data: HealthResponse = await response.json();

        if (data.status !== 'ok') {
          throw new Error('Unexpected API response');
        }

        if (!controller.signal.aborted) {
          setConnection({
            status: 'online',
            service: data.service,
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setConnection({ status: 'offline' });
        }
      }
    }

    void checkConnection();

    return () => controller.abort();
  }, []);

  const connectionLabel =
    connection.status === 'online'
      ? `Connected to ${connection.service}`
      : connection.status === 'connecting'
        ? 'Connecting to API...'
        : 'API unavailable';

  return (
    <main className="min-h-screen bg-canvas px-5 py-12 text-text-primary">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge tone="brand">Design System v0.1</Badge>

            <h1 className="mt-4 text-5xl font-black tracking-tight">
              Run<span className="text-brand">vista</span>
            </h1>

            <p className="mt-3 text-text-secondary">Your Pokémon adventure, live.</p>
          </div>

          <StatusIndicator status={connection.status} label={connectionLabel} />
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-6">
              <p className="text-xs font-semibold tracking-widest text-accent uppercase">
                Components / 01
              </p>

              <h2 className="mt-2 text-2xl font-bold">Buttons</h2>

              <p className="mt-2 text-sm text-text-secondary">
                Interactive controls for your adventure.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setCounter((value) => value + 1)}>Add point</Button>

              <Button
                variant="secondary"
                onClick={() => setCounter((value) => Math.max(0, value - 1))}
                disabled={counter === 0}
              >
                Remove point
              </Button>

              <Button variant="ghost" onClick={() => setCounter(0)}>
                Reset
              </Button>
            </div>

            <div className="mt-6 rounded-xl bg-surface-raised p-4">
              <p className="text-xs text-text-secondary uppercase">Demo counter</p>
              <p className="mt-1 text-3xl font-black text-accent">{counter}</p>
            </div>
          </Card>

          <Card>
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              Components / 02
            </p>

            <h2 className="mt-2 text-2xl font-bold">Badges</h2>

            <p className="mt-2 text-sm text-text-secondary">
              Labels for runs, generations and statuses.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Badge>Classic</Badge>
              <Badge tone="brand">Nuzlocke</Badge>
              <Badge tone="accent">Generation VI</Badge>
              <Badge tone="success">Active</Badge>
            </div>
          </Card>

          <Card elevated>
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              Components / 03
            </p>

            <h2 className="mt-2 text-2xl font-bold">Surfaces</h2>

            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Elevated cards will help distinguish important information, such as the active Pokémon
              team, run progress and streaming controls.
            </p>

            <div className="mt-6 rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-text-secondary">
              Pokémon team preview
            </div>
          </Card>

          <Card>
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              Components / 04
            </p>

            <h2 className="mt-2 text-2xl font-bold">Connection states</h2>

            <div className="mt-6 flex flex-col gap-4">
              <StatusIndicator status="online" label="Service connected" />

              <StatusIndicator status="connecting" label="Connecting..." />

              <StatusIndicator status="offline" label="Service disconnected" />
            </div>
          </Card>
        </div>

        <section className="mt-8">
          <Card>
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">
              Pokémon / Types
            </p>

            <h2 className="mt-2 text-2xl font-bold">Elemental types</h2>

            <p className="mt-2 text-sm text-text-secondary">
              All 18 Pokémon types, ready for team cards and overlays.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {POKEMON_TYPES.map((type) => (
                <PokemonTypeBadge key={type} type={type} size="md" />
              ))}
            </div>
          </Card>
        </section>

        <PokemonCardShowcase />

        <PartyPreviewShowcase />

        <footer className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-text-secondary">
          Runvista · UI component preview
        </footer>
      </div>
    </main>
  );
}

export default App;
