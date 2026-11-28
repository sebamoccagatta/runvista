import { useEffect, useState, type FormEvent } from 'react';

import { POKEMON_GAMES, getPokemonGame } from '@runvista/pokemon';
import { Card } from '@runvista/ui';

import { RunApiError } from '../api/runs.api';
import { inputStyles, primaryButton, secondaryButton } from '../types';

import {
  CHALLENGE_LABELS,
  CHALLENGE_TYPES,
  MAX_LEVEL_CAP_INCREASE,
  getRunConfiguration,
  saveRunConfiguration,
  type ChallengeType,
  type RunConfiguration,
} from './configuration.api';

interface RunConfigurationPanelProps {
  runId: string;
}

type LoadState = 'loading' | 'ready' | 'guest' | 'error';

/** Devuelve el aumento como entero o `null` si el texto no es válido. */
function parseLevelCapIncrease(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) {
    return null;
  }

  const value = Number(text.trim());

  return value <= MAX_LEVEL_CAP_INCREASE ? value : null;
}

export function RunConfigurationPanel({ runId }: RunConfigurationPanelProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [configuration, setConfiguration] = useState<RunConfiguration | null>(null);

  const [gameId, setGameId] = useState('');
  const [challengeType, setChallengeType] = useState<ChallengeType>('NORMAL');
  // Texto del campo: se valida al guardar, así el usuario puede escribir libremente.
  const [levelCapIncrease, setLevelCapIncrease] = useState('0');

  const [retryCount, setRetryCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    getRunConfiguration(runId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;

        setConfiguration(result);
        setGameId(result?.gameId ?? '');
        setChallengeType(result?.challengeType ?? 'NORMAL');
        setLevelCapIncrease(String(result?.levelCapIncrease ?? 0));
        setError(null);
        setSaved(false);
        setLoadState('ready');
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;

        if (cause instanceof RunApiError && cause.status === 401) {
          setLoadState('guest');
        } else {
          setLoadState('error');
        }
      });

    return () => controller.abort();
  }, [runId, retryCount]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const increase = parseLevelCapIncrease(levelCapIncrease);

    if (saving || !gameId) return;

    if (increase === null) {
      setError(
        `El aumento de nivel tiene que ser un número entero entre 0 y ${MAX_LEVEL_CAP_INCREASE}.`,
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const result = await saveRunConfiguration(runId, {
        gameId,
        challengeType,
        levelCapIncrease: increase,
      });

      setConfiguration(result);
      setSaved(true);
    } catch (cause) {
      if (cause instanceof RunApiError && cause.status === 401) {
        setLoadState('guest');
      } else if (cause instanceof RunApiError && cause.status === 404) {
        setError('Esta partida ya no está disponible.');
      } else if (cause instanceof RunApiError && cause.status === 400) {
        setError('Revisá el juego y el tipo de desafío.');
      } else {
        setError('No pudimos guardar la configuración. Intentá nuevamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  const selectedGame = getPokemonGame(gameId);

  return (
    <section aria-labelledby="configuration-heading">
      <Card className="p-6 sm:p-8">
        <div className="mb-6">
          <h3 id="configuration-heading" className="text-xl font-bold">
            Configuración
          </h3>

          <p className="mt-2 text-sm text-text-secondary">
            Elegí el juego y el tipo de desafío de tu aventura.
          </p>
        </div>

        {loadState === 'loading' && (
          <p role="status" className="text-sm text-text-secondary">
            Cargando configuración...
          </p>
        )}

        {loadState === 'guest' && (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              Necesitás iniciar sesión para editar la configuración.
            </p>
            <a href="/api/auth/twitch/login" className={primaryButton}>
              Iniciar con Twitch
            </a>
          </div>
        )}

        {loadState === 'error' && (
          <div className="space-y-4">
            <p role="alert" className="text-sm text-red-300">
              No pudimos cargar la configuración.
            </p>

            <button
              type="button"
              className={secondaryButton}
              onClick={() => {
                setLoadState('loading');
                setRetryCount((count) => count + 1);
              }}
            >
              Reintentar
            </button>
          </div>
        )}

        {loadState === 'ready' && (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="run-game" className="mb-2 block text-sm font-semibold">
                Juego Pokémon
              </label>

              <select
                id="run-game"
                className={inputStyles}
                required
                value={gameId}
                disabled={saving}
                onChange={(event) => {
                  setGameId(event.target.value);
                  setSaved(false);
                }}
              >
                <option value="">Seleccioná un juego</option>

                {POKEMON_GAMES.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name} (Gen. {game.generation})
                  </option>
                ))}
              </select>

              {selectedGame && (
                <p className="mt-2 text-xs text-text-secondary">
                  Generación {selectedGame.generation}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="run-challenge" className="mb-2 block text-sm font-semibold">
                Tipo de desafío
              </label>

              <select
                id="run-challenge"
                className={inputStyles}
                value={challengeType}
                disabled={saving}
                onChange={(event) => {
                  setChallengeType(event.target.value as ChallengeType);
                  setSaved(false);
                }}
              >
                {CHALLENGE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CHALLENGE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="run-level-increase" className="mb-2 block text-sm font-semibold">
                Aumento del nivel de los rivales (%)
              </label>

              <input
                id="run-level-increase"
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_LEVEL_CAP_INCREASE}
                step={1}
                className={inputStyles}
                value={levelCapIncrease}
                disabled={saving}
                onChange={(event) => {
                  setLevelCapIncrease(event.target.value);
                  setSaved(false);
                }}
              />

              <p className="mt-2 text-xs text-text-secondary">
                Sube el tope de nivel de cada medalla. Con 10 %, 14 pasa a 15 (se redondea al entero
                más cercano).
              </p>
            </div>

            {configuration === null && (
              <p className="text-xs text-text-secondary">
                Esta partida todavía no tiene configuración.
              </p>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            {saved && (
              <p role="status" className="text-sm font-semibold text-emerald-300">
                Configuración guardada correctamente.
              </p>
            )}

            <div className="flex justify-end">
              <button type="submit" className={primaryButton} disabled={saving || !gameId}>
                {saving ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </form>
        )}
      </Card>
    </section>
  );
}
