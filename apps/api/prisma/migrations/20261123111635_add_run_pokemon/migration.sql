-- CreateEnum
CREATE TYPE "RunPokemonStatus" AS ENUM ('TEAM', 'BOX', 'FAINTED');

-- CreateTable
CREATE TABLE "RunPokemon" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "speciesId" INTEGER NOT NULL,
    "nickname" VARCHAR(50),
    "level" INTEGER,
    "isShiny" BOOLEAN NOT NULL DEFAULT false,
    "status" "RunPokemonStatus" NOT NULL DEFAULT 'BOX',
    "teamSlot" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunPokemon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RunPokemon_runId_status_idx" ON "RunPokemon"("runId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RunPokemon_runId_teamSlot_key" ON "RunPokemon"("runId", "teamSlot");

-- AddForeignKey
ALTER TABLE "RunPokemon" ADD CONSTRAINT "RunPokemon_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
