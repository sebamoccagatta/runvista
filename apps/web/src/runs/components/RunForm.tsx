import { useState, type FormEvent } from 'react';

import { Card } from '@runvista/ui';

import {
  RUN_STATUSES,
  RUN_STATUS_LABELS,
  inputStyles,
  primaryButton,
  secondaryButton,
  type Run,
  type RunStatus,
} from '../types';

export interface RunFormValues {
  title: string;
  description: string | null;
  status: RunStatus;
}

interface RunFormProps {
  run?: Run;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (values: RunFormValues) => Promise<void>;
}

export function RunForm({ run, saving, error, onCancel, onSubmit }: RunFormProps) {
  const editing = Boolean(run);

  const [title, setTitle] = useState(run?.title ?? '');
  const [description, setDescription] = useState(run?.description ?? '');
  const [status, setStatus] = useState<RunStatus>(run?.status ?? 'DRAFT');
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();

    if (normalizedTitle.length < 1 || normalizedTitle.length > 150) {
      setValidationError('El nombre debe tener entre 1 y 150 caracteres.');
      return;
    }

    if (normalizedDescription.length > 2000) {
      setValidationError('La descripción no puede superar los 2000 caracteres.');
      return;
    }

    setValidationError(null);

    void onSubmit({
      title: normalizedTitle,
      description: normalizedDescription || null,
      status,
    });
  }

  return (
    <section aria-labelledby="run-form-heading" className="mb-8">
      <Card className="p-6 sm:p-8">
        <div className="mb-6">
          <h2 id="run-form-heading" className="text-2xl font-bold">
            {editing ? 'Editar partida' : 'Nueva partida'}
          </h2>

          <p className="mt-2 text-sm text-text-secondary">
            {editing
              ? 'Actualizá los detalles y el estado de tu aventura.'
              : 'Dale un nombre a tu aventura Pokémon.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="run-title" className="mb-2 block text-sm font-semibold">
              Nombre de la partida
            </label>

            <input
              id="run-title"
              type="text"
              required
              maxLength={150}
              value={title}
              disabled={saving}
              onChange={(event) => {
                setTitle(event.target.value);
                setValidationError(null);
              }}
              placeholder="Ej. Pokémon Esmeralda Nuzlocke"
              className={inputStyles}
            />
          </div>

          <div>
            <label htmlFor="run-description" className="mb-2 block text-sm font-semibold">
              Descripción
              <span className="ml-2 font-normal text-text-secondary">Opcional</span>
            </label>

            <textarea
              id="run-description"
              rows={4}
              maxLength={2000}
              value={description}
              disabled={saving}
              onChange={(event) => {
                setDescription(event.target.value);
                setValidationError(null);
              }}
              placeholder="Contá de qué trata tu desafío..."
              className={`${inputStyles} resize-y`}
            />

            <p className="mt-2 text-right text-xs text-text-secondary">{description.length}/2000</p>
          </div>

          {editing && (
            <div>
              <label htmlFor="run-status" className="mb-2 block text-sm font-semibold">
                Estado de la partida
              </label>

              <select
                id="run-status"
                value={status}
                disabled={saving}
                onChange={(event) => setStatus(event.target.value as RunStatus)}
                className={inputStyles}
              >
                {RUN_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {RUN_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-text-secondary">
                El estado te ayuda a organizar tus desafíos.
              </p>
            </div>
          )}

          {(validationError || error) && (
            <p
              role="alert"
              className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
            >
              {validationError || error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className={secondaryButton} disabled={saving} onClick={onCancel}>
              Cancelar
            </button>

            <button type="submit" className={primaryButton} disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear partida'}
            </button>
          </div>
        </form>
      </Card>
    </section>
  );
}
