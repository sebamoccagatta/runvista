
-- Validar que el identificador de especie esté dentro
-- del rango admitido por la aplicación.
ALTER TABLE "RunPokemon"
ADD CONSTRAINT "RunPokemon_speciesId_range_check"
CHECK (
    "speciesId" BETWEEN 1 AND 9999
);

-- Los niveles son opcionales, pero si existen
-- deben estar entre 1 y 100.
ALTER TABLE "RunPokemon"
ADD CONSTRAINT "RunPokemon_level_range_check"
CHECK (
    "level" IS NULL
    OR "level" BETWEEN 1 AND 100
);

-- Solo los Pokémon del equipo pueden ocupar slots.
-- Los slots válidos son del 1 al 6.
-- Caja y bajas deben tener teamSlot NULL.
ALTER TABLE "RunPokemon"
ADD CONSTRAINT "RunPokemon_teamSlot_status_check"
CHECK (
    (
        "status" = 'TEAM'
        AND "teamSlot" IS NOT NULL
        AND "teamSlot" BETWEEN 1 AND 6
    )
    OR
    (
        "status" <> 'TEAM'
        AND "teamSlot" IS NULL
    )
);
