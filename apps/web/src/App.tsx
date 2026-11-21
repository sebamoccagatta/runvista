import { useEffect, useState } from 'react';

type HealthResponse = {
  status: 'ok';
  service: string;
};

type ConnectionState =
  | { status: 'loading' }
  | { status: 'connected'; data: HealthResponse }
  | { status: 'error'; message: string };

export default function App() {
  const [connection, setConnection] = useState<ConnectionState>({
    status: 'loading',
  });

  useEffect(() => {
    const controller = new AbortController();

    async function checkConnection() {
      try {
        const response = await fetch('/api/health', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: HealthResponse = await response.json();

        if (data.status !== 'ok') {
          throw new Error('Unexpected API response');
        }

        if (!controller.signal.aborted) {
          setConnection({
            status: 'connected',
            data,
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setConnection({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown connection error',
          });
        }
      }
    }

    void checkConnection();

    return () => controller.abort();
  }, []);

  return (
    <main>
      <h1>Runvista</h1>
      <p>Pokémon streaming platform</p>

      <section aria-label="API status">
        <h2>Estado del backend</h2>

        {connection.status === 'loading' && <p>Comprobando conexión...</p>}

        {connection.status === 'connected' && (
          <p role="status">Conectado: {connection.data.service}</p>
        )}

        {connection.status === 'error' && (
          <p role="alert">Error de conexión: {connection.message}</p>
        )}
      </section>
    </main>
  );
}
