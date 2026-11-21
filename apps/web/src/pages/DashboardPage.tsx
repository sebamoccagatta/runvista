import { Badge, Card } from '@runvista/ui';

export function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:py-16">
      <div className="mb-10">
        <Badge tone="accent">Workspace</Badge>

        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">Mis partidas</h1>

        <p className="mt-4 max-w-2xl text-text-secondary">
          Acá vas a poder organizar tus aventuras Pokémon, administrar equipos y preparar tus
          overlays.
        </p>
      </div>

      <Card className="flex min-h-72 flex-col items-center justify-center text-center">
        <div
          aria-hidden="true"
          className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-surface-raised text-3xl"
        >
          ◇
        </div>

        <Badge tone="brand">En desarrollo</Badge>

        <h2 className="mt-5 text-2xl font-bold">Tu próxima aventura comienza acá</h2>

        <p className="mt-3 max-w-lg text-sm leading-relaxed text-text-secondary">
          Próximamente podrás crear partidas, configurar desafíos y gestionar tu equipo Pokémon
          desde Runvista.
        </p>
      </Card>
    </main>
  );
}
