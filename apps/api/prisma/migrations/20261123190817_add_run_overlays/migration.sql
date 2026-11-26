-- CreateTable
CREATE TABLE "RunOverlay" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "layout" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunOverlay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RunOverlay_runId_idx" ON "RunOverlay"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "RunOverlay_runId_name_key" ON "RunOverlay"("runId", "name");

-- AddForeignKey
ALTER TABLE "RunOverlay" ADD CONSTRAINT "RunOverlay_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
