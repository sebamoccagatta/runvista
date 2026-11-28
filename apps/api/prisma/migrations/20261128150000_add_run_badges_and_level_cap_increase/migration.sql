-- AlterTable
ALTER TABLE "RunConfiguration" ADD COLUMN     "levelCapIncrease" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RunBadge" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "badgeKey" VARCHAR(40) NOT NULL,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RunBadge_runId_idx" ON "RunBadge"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "RunBadge_runId_badgeKey_key" ON "RunBadge"("runId", "badgeKey");

-- AddForeignKey
ALTER TABLE "RunBadge" ADD CONSTRAINT "RunBadge_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
