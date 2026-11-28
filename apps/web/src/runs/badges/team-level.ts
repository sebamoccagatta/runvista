interface TeamMemberLevel {
  status: string;
  level: number | null;
}

/** Nivel más alto del equipo activo; `null` si no hay ningún Pokémon con nivel. */
export function getHighestTeamLevel(team: readonly TeamMemberLevel[]): number | null {
  let highest: number | null = null;

  for (const member of team) {
    if (member.status !== 'TEAM' || member.level === null) {
      continue;
    }

    highest = highest === null ? member.level : Math.max(highest, member.level);
  }

  return highest;
}

/** `true` si el equipo ya supera el tope de la medalla pendiente. */
export function isTeamOverCap(highestLevel: number | null, levelCap: number): boolean {
  return highestLevel !== null && highestLevel > levelCap;
}
