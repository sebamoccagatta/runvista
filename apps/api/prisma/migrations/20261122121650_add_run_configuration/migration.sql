-- CreateEnum
CREATE TYPE "ChallengeType" AS ENUM ('NORMAL', 'NUZLOCKE', 'RANDOMLOCKE', 'CUSTOM');

-- CreateTable
CREATE TABLE "RunConfiguration" (
    "runId" UUID NOT NULL,
    "gameId" VARCHAR(80) NOT NULL,
    "challengeType" "ChallengeType" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunConfiguration_pkey" PRIMARY KEY ("runId")
);

-- AddForeignKey
ALTER TABLE "RunConfiguration" ADD CONSTRAINT "RunConfiguration_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
