import { Link } from 'react-router';
import { Badge } from '@runvista/ui';

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center px-5 py-16 text-center">
      <Badge tone="brand">Error 404</Badge>

      <h1 className="mt-6 text-4xl font-black sm:text-6xl">Esta ruta se perdió.</h1>

      <p className="mt-5 text-text-secondary">No encontramos la página que estabas buscando.</p>

      <Link
        to="/"
        className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
