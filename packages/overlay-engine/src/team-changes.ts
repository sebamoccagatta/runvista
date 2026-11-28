/**
 * Detección de cambios en el equipo entre dos snapshots consecutivos.
 *
 * Solo compara lo que se ve en el overlay: si cambia el id interno de la fila
 * pero no la especie, la forma, el apodo ni la ball, no hay nada que animar.
 */

export interface TeamChangeMember {
  speciesId: number;
  pokemonId?: number | null;
  isShiny: boolean;
  nickname: string | null;
  pokeBall?: string | null;
  teamSlot: number | null;
  status?: 'TEAM' | 'BOX' | 'FAINTED';
}

export interface TeamSnapshotChanges {
  /** Espacios vacíos antes y ocupados ahora: un Pokémon capturado. */
  captured: number[];
  /** Espacios ocupados antes y con otro Pokémon ahora. */
  replaced: number[];
  /** Espacios ocupados antes y vacíos ahora. */
  removed: number[];
}

/** Miembros del equipo indexados por su espacio. Ignora los que no están en el equipo. */
export function getTeamSlotMembers<T extends TeamChangeMember>(
  members: readonly T[],
): Map<number, T> {
  const slots = new Map<number, T>();

  for (const member of members) {
    if (member.teamSlot === null) {
      continue;
    }

    if (member.status !== undefined && member.status !== 'TEAM') {
      continue;
    }

    slots.set(member.teamSlot, member);
  }

  return slots;
}

/** Huella de lo visible de un Pokémon. Dos miembros con la misma huella se ven igual. */
export function getTeamMemberFingerprint(member: TeamChangeMember): string {
  return JSON.stringify([
    member.speciesId,
    member.pokemonId ?? null,
    member.isShiny,
    member.nickname ?? null,
    member.pokeBall ?? null,
  ]);
}

/**
 * Compara las huellas por espacio de dos snapshots.
 * El primer snapshot (sin anterior) no es un cambio: quien llama debe tratarlo aparte.
 */
export function diffTeamSnapshots(
  previous: ReadonlyMap<number, string>,
  next: ReadonlyMap<number, string>,
): TeamSnapshotChanges {
  const captured: number[] = [];
  const replaced: number[] = [];
  const removed: number[] = [];

  for (const [slot, fingerprint] of next) {
    const before = previous.get(slot);

    if (before === undefined) {
      captured.push(slot);
    } else if (before !== fingerprint) {
      replaced.push(slot);
    }
  }

  for (const slot of previous.keys()) {
    if (!next.has(slot)) {
      removed.push(slot);
    }
  }

  return { captured, replaced, removed };
}
