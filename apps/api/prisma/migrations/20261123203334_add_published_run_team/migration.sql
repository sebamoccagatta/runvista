-- CreateTable
CREATE TABLE "RunPublishedTeam" (
    "runId" UUID NOT NULL,
    "team" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunPublishedTeam_pkey" PRIMARY KEY ("runId")
);

-- AddForeignKey
ALTER TABLE "RunPublishedTeam" ADD CONSTRAINT "RunPublishedTeam_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
