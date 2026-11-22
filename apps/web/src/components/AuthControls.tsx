import { useEffect, useState } from 'react';

interface AuthenticatedUser {
  id: string;
  twitchId: string | null;
  displayName: string;
}

type AuthState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'authenticated'; user: AuthenticatedUser }
  | { status: 'error' };

const buttonBase =
  'inline-flex items-center justify-center rounded-xl px-4 py-2 ' +
  'text-sm font-semibold transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-accent';

export function AuthControls() {
  const [auth, setAuth] = useState<AuthState>({
    status: 'loading',
  });

  const [retryCount, setRetryCount] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          return { status: 'guest' } as AuthState;
        }

        if (!response.ok) {
          throw new Error('Session request failed');
        }

        const data: unknown = await response.json();

        if (
          typeof data !== 'object' ||
          data === null ||
          !('user' in data) ||
          typeof data.user !== 'object' ||
          data.user === null ||
          !('id' in data.user) ||
          typeof data.user.id !== 'string' ||
          !('displayName' in data.user) ||
          typeof data.user.displayName !== 'string'
        ) {
          throw new Error('Invalid session response');
        }

        return {
          status: 'authenticated',
          user: data.user as AuthenticatedUser,
        } as AuthState;
      })
      .then((nextState) => {
        if (!controller.signal.aborted) {
          setAuth(nextState);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setAuth({ status: 'error' });
        }
      });

    return () => {
      controller.abort();
    };
  }, [retryCount]);

  function handleRetry() {
    setAuth({ status: 'loading' });
    setRetryCount((current) => current + 1);
  }

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      setAuth({ status: 'guest' });
    } catch {
      // Una falla no garantiza que la sesión
      // haya sido revocada correctamente.
      setAuth({ status: 'error' });
    } finally {
      setLoggingOut(false);
    }
  }

  if (auth.status === 'loading') {
    return (
      <div
        aria-label="Comprobando sesión"
        role="status"
        className="h-10 w-36 animate-pulse rounded-xl bg-white/10"
      />
    );
  }

  if (auth.status === 'error') {
    return (
      <button
        type="button"
        onClick={handleRetry}
        className={`${buttonBase} border border-white/15 text-text-secondary hover:bg-white/5`}
      >
        Reintentar conexión
      </button>
    );
  }

  if (auth.status === 'guest') {
    return (
      <a
        href="/api/auth/twitch/login"
        className={`${buttonBase} bg-[#6441a5] text-white hover:bg-[#7b55c7]`}
      >
        Iniciar con Twitch
      </a>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex min-w-0 flex-col text-right">
        <span className="max-w-40 truncate text-sm font-semibold text-text-primary">
          {auth.user.displayName}
        </span>

        <span className="text-xs text-text-secondary">Sesión iniciada</span>
      </div>

      <button
        type="button"
        disabled={loggingOut}
        onClick={() => void handleLogout()}
        className={`${buttonBase} border border-white/15 text-text-secondary hover:bg-white/5 disabled:cursor-wait disabled:opacity-50`}
      >
        {loggingOut ? 'Cerrando...' : 'Salir'}
      </button>
    </div>
  );
}
