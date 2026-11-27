import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';

import {
  cloneOverlayStyle,
  DEFAULT_OVERLAY_STYLE,
  resolveElementStyle,
  type OverlayStyle,
  type OverlayStylePatch,
} from '@runvista/overlay-engine';

import { listRunPokemon, type RunPokemon } from '../runs/pokemon/pokemon.api';

import {
  createDefaultOverlayLayout,
  createRunOverlay,
  deleteRunOverlay,
  getOverlayErrorMessage,
  listRunOverlays,
  updateRunOverlay,
  type OverlayElement,
  type OverlayLayout,
  type RunOverlay,
} from '../runs/overlays/overlay.api';

import { OverlayCanvas } from '../runs/overlays/OverlayCanvas';

import { OverlayStyleControls, type StyleGroup } from '../runs/overlays/OverlayStyleControls';

import { inputStyles, primaryButton, secondaryButton } from '../runs/types';

import { OverlayAccessActions } from '../runs/overlays/OverlayAccessActions';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function RunOverlayEditorPage() {
  const { id: runId } = useParams<{ id: string }>();
  return <RunOverlayEditor key={runId} runId={runId} />;
}

function RunOverlayEditor({ runId }: { runId: string | undefined }) {
  const [overlays, setOverlays] = useState<RunOverlay[]>([]);
  const [pokemon, setPokemon] = useState<RunPokemon[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [name, setName] = useState('Gameplay');
  const [layout, setLayout] = useState<OverlayLayout>(createDefaultOverlayLayout);
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RunOverlay | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const busy = saving || deleting;
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) {
      return;
    }

    const controller = new AbortController();

    Promise.all([
      listRunOverlays(runId, controller.signal),
      listRunPokemon(runId, controller.signal),
    ])
      .then(([savedOverlays, savedPokemon]) => {
        if (controller.signal.aborted) return;

        setOverlays(savedOverlays);
        setPokemon(savedPokemon);

        const first = savedOverlays[0];

        if (first) {
          setCurrentId(first.id);
          setName(first.name);
          setLayout(first.layout);
        }

        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;

        setError(getOverlayErrorMessage(cause));
        setLoadFailed(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, [runId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (deleteTarget && !dialog.open) dialog.showModal();
    if (!deleteTarget && dialog.open) dialog.close();
  }, [deleteTarget]);

  const selectedElement = layout.elements.find((item) => item.slot === selectedSlot);

  function changeLayout(next: OverlayLayout) {
    setLayout(next);
    setDirty(true);
    setMessage(null);
  }

  function updateElement(slot: number, changes: Partial<OverlayElement>) {
    const nextElements = layout.elements.map((element) => {
      if (element.slot !== slot) {
        return element;
      }

      const next = { ...element, ...changes };

      next.width = clamp(next.width, 80, 600);
      next.height = clamp(next.height, 80, 600);

      next.x = clamp(next.x, 0, 1920 - next.width);
      next.y = clamp(next.y, 0, 1080 - next.height);

      return next;
    });

    changeLayout({ ...layout, elements: nextElements });
  }

  function updateCommonStyle<G extends StyleGroup>(group: G, changes: Partial<OverlayStyle[G]>) {
    changeLayout({
      ...layout,
      style: { ...layout.style, [group]: { ...layout.style[group], ...changes } },
    });
  }

  function resetCommonStyle() {
    changeLayout({ ...layout, style: cloneOverlayStyle(DEFAULT_OVERLAY_STYLE) });
  }

  /** Reemplaza el ajuste de un espacio. `undefined` lo quita y vuelve al estilo común. */
  function setElementStyle(slot: number, style: OverlayStylePatch | undefined) {
    changeLayout({
      ...layout,
      elements: layout.elements.map((element) => {
        if (element.slot !== slot) {
          return element;
        }

        const next = { ...element };
        delete next.style;

        return style === undefined ? next : { ...next, style };
      }),
    });
  }

  function updateElementStyle<G extends StyleGroup>(
    slot: number,
    group: G,
    changes: Partial<OverlayStyle[G]>,
  ) {
    const current = layout.elements.find((element) => element.slot === slot)?.style ?? {};

    setElementStyle(slot, { ...current, [group]: { ...current[group], ...changes } });
  }

  function resetElementStyleGroup(slot: number, group: StyleGroup) {
    const next: OverlayStylePatch = {
      ...(layout.elements.find((element) => element.slot === slot)?.style ?? {}),
    };

    delete next[group];

    setElementStyle(slot, next);
  }

  /** Vuelve a las posiciones por defecto sin perder el estilo común ni los ajustes por posición. */
  function resetDistribution() {
    const defaults = createDefaultOverlayLayout();

    changeLayout({
      ...defaults,
      style: layout.style,
      animations: layout.animations,
      elements: defaults.elements.map((element) => {
        const previous = layout.elements.find((item) => item.slot === element.slot);

        return previous?.style ? { ...element, style: previous.style } : element;
      }),
    });

    setSelectedSlot(1);
  }

  function selectOverlay(value: string) {
    if (busy || deleteTarget) return;
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Descartarlos?')) {
      return;
    }

    const selected = overlays.find((item) => item.id === value);

    if (!selected) return;

    setCurrentId(selected.id);
    setName(selected.name);
    setLayout(selected.layout);
    setSelectedSlot(1);
    setDirty(false);
    setError(null);
    setMessage(null);
  }

  function createDraft() {
    if (busy || deleteTarget) return;
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Descartarlos?')) {
      return;
    }

    setCurrentId(null);
    setName(`Overlay ${overlays.length + 1}`);
    setLayout(createDefaultOverlayLayout());
    setSelectedSlot(1);
    setDirty(true);
    setError(null);
    setMessage(null);
  }

  async function save() {
    if (!runId || busy || deleteTarget || !name.trim()) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const saved = currentId
        ? await updateRunOverlay(runId, currentId, {
            name: name.trim(),
            layout,
          })
        : await createRunOverlay(runId, name.trim(), layout);

      setOverlays((previous) => {
        const exists = previous.some((item) => item.id === saved.id);

        return exists
          ? previous.map((item) => (item.id === saved.id ? saved : item))
          : [...previous, saved];
      });

      setCurrentId(saved.id);
      setName(saved.name);
      setLayout(saved.layout);
      setDirty(false);
      setMessage('Diseño guardado correctamente.');
    } catch (cause) {
      setError(getOverlayErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  function requestDeletion() {
    if (busy || !currentId) return;
    const target = overlays.find((item) => item.id === currentId);
    if (!target) return;
    setDeleteError(null);
    setDeleteTarget(target);
  }

  function cancelDeletion() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  }

  async function confirmDeletion() {
    if (!runId || !deleteTarget || busy) return;
    const target = deleteTarget;
    setDeleting(true);
    setDeleteError(null);
    setError(null);
    setMessage(null);

    try {
      await deleteRunOverlay(runId, target.id);
      const remaining = overlays.filter((item) => item.id !== target.id);
      const next = remaining[0];
      setOverlays(remaining);
      setCurrentId(next?.id ?? null);
      setName(next?.name ?? 'Gameplay');
      setLayout(next?.layout ?? createDefaultOverlayLayout());
      setSelectedSlot(1);
      setDirty(false);
      setDeleteTarget(null);
      setMessage('Diseño eliminado correctamente. Su enlace de OBS ya no está disponible.');
    } catch (cause) {
      setDeleteError(getOverlayErrorMessage(cause));
    } finally {
      setDeleting(false);
    }
  }

  if (!runId) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-12">
        <p role="alert">No encontramos la partida.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-7 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to={`/app/runs/${runId}`}
            className="text-sm font-semibold text-text-secondary hover:text-accent"
          >
            ← Volver a la partida
          </Link>

          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            Editor de overlays
          </h1>

          <p className="mt-2 text-sm text-text-secondary">
            Organizá los seis espacios del equipo a tu gusto.
          </p>
        </div>

        <span className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-xs font-bold text-accent">
          Editor visual · Beta
        </span>
      </div>

      {loading ? (
        <div role="status" className="rounded-card border border-white/10 bg-surface p-8">
          Cargando diseños y Pokémon...
        </div>
      ) : loadFailed ? (
        <div role="alert" className="rounded-card border border-brand/30 bg-surface p-6">
          {error}
        </div>
      ) : (
        <>
          <section className="flex flex-wrap items-end gap-3 rounded-card border border-white/10 bg-surface p-4 sm:p-5">
            <label className="min-w-48 flex-1 space-y-2">
              <span className="block text-xs font-semibold text-text-secondary">Diseño actual</span>

              <select
                className={inputStyles}
                value={currentId ?? ''}
                disabled={busy || deleteTarget !== null}
                onChange={(event) => selectOverlay(event.target.value)}
              >
                {currentId === null && <option value="">Nuevo diseño sin guardar</option>}

                {overlays.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className={secondaryButton}
              disabled={busy || deleteTarget !== null}
              onClick={createDraft}
            >
              + Nuevo diseño
            </button>

            <button
              type="button"
              className={primaryButton}
              disabled={
                busy || deleteTarget !== null || !name.trim() || (!dirty && currentId !== null)
              }
              onClick={() => void save()}
            >
              {saving ? 'Guardando...' : 'Guardar diseño'}
            </button>

            <button
              type="button"
              className={`${secondaryButton} border-red-500/40 text-red-400 hover:border-red-500 hover:bg-red-500/10`}
              disabled={busy || deleteTarget !== null || currentId === null}
              onClick={requestDeletion}
            >
              Eliminar diseño
            </button>
          </section>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-brand/30 bg-brand/10 p-4 text-sm text-brand"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success"
            >
              {message}
            </p>
          )}

          {overlays.length === 0 && currentId === null && (
            <p className="rounded-card border border-white/10 bg-surface p-4 text-sm text-text-secondary">
              No hay diseños guardados. Podés configurar y guardar un nuevo diseño desde el editor.
            </p>
          )}

          <div inert={busy || deleteTarget !== null}>
            <OverlayAccessActions
              key={`${runId}:${currentId ?? 'draft'}`}
              runId={runId}
              overlayId={currentId}
            />

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              {/* Fijo en pantallas anchas: el panel de estilo es largo y así el lienzo
                  sigue a la vista mientras se ajustan los controles. */}
              <section className="min-w-0 space-y-4 rounded-card border border-white/10 bg-surface p-4 sm:p-6 xl:sticky xl:top-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold">Vista de edición</h2>

                  <span className="text-xs text-text-secondary">
                    {dirty ? 'Cambios sin guardar' : 'Sin cambios pendientes'}
                  </span>
                </div>

                <OverlayCanvas
                  layout={layout}
                  pokemon={pokemon}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                  onChange={changeLayout}
                />
              </section>

              <aside className="space-y-5 rounded-card border border-white/10 bg-surface p-5">
                <div>
                  <h2 className="text-lg font-bold">Propiedades</h2>
                  <p className="mt-1 text-xs text-text-secondary">
                    Ajustá la posición seleccionada.
                  </p>
                </div>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold text-text-secondary">
                    Nombre del diseño
                  </span>
                  <input
                    className={inputStyles}
                    maxLength={80}
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setDirty(true);
                      setMessage(null);
                    }}
                  />
                </label>

                <fieldset className="space-y-2">
                  <legend className="text-xs font-semibold text-text-secondary">
                    Posición del equipo
                  </legend>

                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        aria-pressed={selectedSlot === slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`min-h-10 rounded-lg border text-sm font-bold ${
                          selectedSlot === slot
                            ? 'border-accent bg-accent/15 text-accent'
                            : 'border-white/10 text-text-secondary hover:border-white/40'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {selectedElement && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {(
                        [
                          ['x', 'Posición X'],
                          ['y', 'Posición Y'],
                          ['width', 'Ancho'],
                          ['height', 'Alto'],
                        ] as const
                      ).map(([field, label]) => (
                        <label key={field} className="space-y-2">
                          <span className="block text-xs font-semibold text-text-secondary">
                            {label}
                          </span>
                          <input
                            className={`${inputStyles} px-3`}
                            type="number"
                            step={1}
                            min={field === 'width' || field === 'height' ? 80 : 0}
                            max={
                              field === 'width'
                                ? Math.min(600, 1920 - selectedElement.x)
                                : field === 'height'
                                  ? Math.min(600, 1080 - selectedElement.y)
                                  : field === 'x'
                                    ? 1920 - selectedElement.width
                                    : 1080 - selectedElement.height
                            }
                            value={selectedElement[field]}
                            onChange={(event) => {
                              const value = event.target.valueAsNumber;
                              if (!Number.isFinite(value)) return;

                              updateElement(selectedSlot, {
                                [field]: Math.round(value),
                              });
                            }}
                          />
                        </label>
                      ))}
                    </div>

                    <fieldset className="space-y-3 border-t border-white/10 pt-4">
                      <legend className="text-sm font-bold">Visibilidad</legend>

                      {(
                        [
                          ['visible', 'Mostrar elemento'],
                          ['showNickname', 'Mostrar apodo'],
                          ['showSpecies', 'Mostrar especie'],
                          ['showLevel', 'Mostrar nivel'],
                        ] as const
                      ).map(([field, label]) => (
                        <label
                          key={field}
                          className="flex min-h-10 items-center justify-between gap-3 text-sm"
                        >
                          <span>{label}</span>
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-accent"
                            checked={selectedElement[field]}
                            onChange={(event) =>
                              updateElement(selectedSlot, {
                                [field]: event.target.checked,
                              })
                            }
                          />
                        </label>
                      ))}
                    </fieldset>
                  </>
                )}

                <section
                  aria-labelledby="common-style-title"
                  className="space-y-3 border-t border-white/10 pt-4"
                >
                  <div>
                    <h3 id="common-style-title" className="text-sm font-bold">
                      Estilo del equipo
                    </h3>
                    <p className="mt-1 text-xs text-text-secondary">
                      Se aplica a las seis posiciones.
                    </p>
                  </div>

                  <OverlayStyleControls
                    idPrefix="common"
                    style={layout.style}
                    onChange={updateCommonStyle}
                  />

                  <button
                    type="button"
                    className={`${secondaryButton} w-full`}
                    onClick={resetCommonStyle}
                  >
                    Restablecer estilo
                  </button>
                </section>

                {selectedElement && (
                  <section
                    aria-labelledby="slot-style-title"
                    className="space-y-3 border-t border-white/10 pt-4"
                  >
                    <div>
                      <h3 id="slot-style-title" className="text-sm font-bold">
                        Estilo de la posición {selectedSlot}
                      </h3>
                      <p className="mt-1 text-xs text-text-secondary">
                        Cambiá solo lo que quieras distinto del estilo del equipo.
                      </p>
                    </div>

                    <label className="flex min-h-10 items-center justify-between gap-3 text-sm">
                      <span>Personalizar esta posición</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-accent"
                        checked={selectedElement.style !== undefined}
                        onChange={(event) =>
                          setElementStyle(selectedSlot, event.target.checked ? {} : undefined)
                        }
                      />
                    </label>

                    {selectedElement.style !== undefined && (
                      <OverlayStyleControls
                        idPrefix={`slot-${selectedSlot}`}
                        style={resolveElementStyle(layout, selectedElement)}
                        onChange={(group, changes) =>
                          updateElementStyle(selectedSlot, group, changes)
                        }
                        overridden={{
                          card: selectedElement.style.card !== undefined,
                          label: selectedElement.style.label !== undefined,
                          ball: selectedElement.style.ball !== undefined,
                        }}
                        onResetGroup={(group) => resetElementStyleGroup(selectedSlot, group)}
                      />
                    )}
                  </section>
                )}

                <button
                  type="button"
                  className={`${secondaryButton} w-full`}
                  onClick={resetDistribution}
                >
                  Restablecer distribución
                </button>
              </aside>
            </div>
          </div>
        </>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-overlay-title"
        aria-describedby="delete-overlay-description"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-white/10 bg-surface p-6 text-inherit shadow-2xl backdrop:bg-black/70"
        onCancel={(event) => {
          event.preventDefault();
          cancelDeletion();
        }}
      >
        {deleteTarget && (
          <div className="space-y-4">
            <h2 id="delete-overlay-title" className="text-xl font-bold">
              Eliminar diseño
            </h2>
            <p id="delete-overlay-description" className="text-sm text-text-secondary">
              ¿Querés eliminar «{deleteTarget.name}»? El diseño se eliminará permanentemente y su
              enlace de OBS dejará de funcionar. La partida y sus Pokémon no se verán afectados.
            </p>
            {dirty && (
              <p className="text-sm text-amber-400">
                También se perderán los cambios sin guardar de este diseño.
              </p>
            )}
            {deleteError && (
              <p role="alert" className="text-sm text-red-400">
                {deleteError}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className={secondaryButton}
                disabled={deleting}
                onClick={cancelDeletion}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="min-h-10 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                disabled={deleting}
                onClick={() => void confirmDeletion()}
              >
                {deleting ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
