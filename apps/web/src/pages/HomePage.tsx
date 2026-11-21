import { Link } from 'react-router';
import { Badge, Card, PartyPreview, type PokemonCardData } from '@runvista/ui';

const exampleParty: (PokemonCardData | null)[] = [
  {
    id: 1,
    species: 'Bulbasaur',
    nickname: 'Verdín',
    level: 24,
    types: ['grass', 'poison'],
    imageUrl:
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
  },
  {
    id: 6,
    species: 'Charizard',
    nickname: 'Ignis',
    level: 42,
    types: ['fire', 'flying'],
    imageUrl:
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
  },
  {
    id: 25,
    species: 'Pikachu',
    nickname: 'Chispa',
    level: 18,
    types: ['electric'],
    imageUrl:
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
  },
];

const features = [
  {
    number: '01',
    title: 'Tu equipo, siempre visible',
    description: 'Mostrá a tus Pokémon, sus apodos y el progreso de tu aventura.',
  },
  {
    number: '02',
    title: 'Partidas organizadas',
    description: 'Un espacio para gestionar tus desafíos y seguir cada recorrido.',
  },
  {
    number: '03',
    title: 'Preparado para streaming',
    description: 'Una plataforma diseñada para evolucionar hacia overlays de OBS.',
  },
];

export function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden px-5 py-20 sm:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand/10 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <Badge tone="accent">Pokémon · Streaming · Adventures</Badge>

            <h1 className="mt-7 text-5xl leading-tight font-black tracking-tight sm:text-7xl">
              Cada aventura
              <span className="block text-brand">merece ser vista.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary">
              Organizá tus equipos Pokémon, seguí tus desafíos y prepará tus aventuras para
              compartirlas en directo.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/app"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Explorar Runvista
              </Link>

              <a
                href="#caracteristicas"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-surface px-6 text-sm font-bold text-text-primary transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Conocer la plataforma
              </a>
            </div>

            <p className="mt-5 text-xs text-text-secondary">
              Versión en desarrollo · Funcionalidades en construcción
            </p>
          </div>

          <div className="mt-16">
            <Card elevated className="overflow-hidden">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold tracking-widest text-accent uppercase">
                    Vista previa
                  </p>
                  <h2 className="mt-2 text-xl font-bold">Tu equipo Pokémon</h2>
                </div>

                <Badge tone="success">Demo visual</Badge>
              </div>

              <PartyPreview pokemon={exampleParty} />
            </Card>
          </div>
        </div>
      </section>

      <section id="caracteristicas" className="border-t border-white/10 bg-surface/40 px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <Badge tone="brand">La plataforma</Badge>
            <h2 className="mt-4 text-3xl font-black sm:text-4xl">Diseñada para tus desafíos</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.number} className="h-full">
                <span className="text-sm font-black text-accent">{feature.number}</span>
                <h3 className="mt-5 text-xl font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
