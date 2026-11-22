import { useEffect, useRef } from 'react';

import { primaryButton, secondaryButton, type Run } from '../types';

interface DeleteRunDialogProps {
  run: Run;
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteRunDialog({
  run,
  deleting,
  error,
  onCancel,
  onConfirm,
}: DeleteRunDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Al cerrar, restaurar el foco al elemento que
  // abrió el diálogo, siempre que todavía exista.
  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    cancelButtonRef.current?.focus();

    return () => {
      if (previousFocus?.isConnected) {
        previousFocus.focus();
        return;
      }

      // Si se eliminó la tarjeta, buscar una acción
      // disponible fuera del diálogo.
      const fallback = document.querySelector<HTMLElement>('main button:not(:disabled)');

      fallback?.focus();
    };
  }, []);

  // Si todos los controles están deshabilitados
  // durante el borrado, mantener el foco en el diálogo.
  useEffect(() => {
    if (deleting) {
      dialogRef.current?.focus();
    }
  }, [deleting]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (!deleting) {
          event.preventDefault();
          onCancel();
        }
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const buttons = Array.from(
        dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
      );

      if (buttons.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = buttons[0];
      const last = buttons[buttons.length - 1];

      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleting, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-5 py-8 backdrop-blur-sm">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-run-title"
        aria-describedby="delete-run-description"
        className="w-full max-w-md rounded-card border border-white/15 bg-surface p-6 shadow-2xl outline-none sm:p-8"
      >
        <div
          aria-hidden="true"
          className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-red-400/10 text-2xl text-red-300"
        >
          !
        </div>

        <h2 id="delete-run-title" className="text-2xl font-bold">
          ¿Eliminar partida?
        </h2>

        <p
          id="delete-run-description"
          className="mt-3 break-words text-sm leading-6 text-text-secondary"
        >
          Estás por eliminar <strong>{run.title}</strong>. Esta acción no se puede deshacer.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={deleting}
            onClick={onCancel}
            className={secondaryButton}
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className={`${primaryButton} bg-red-500 hover:bg-red-600`}
          >
            {deleting ? 'Eliminando...' : 'Eliminar partida'}
          </button>
        </div>
      </div>
    </div>
  );
}
