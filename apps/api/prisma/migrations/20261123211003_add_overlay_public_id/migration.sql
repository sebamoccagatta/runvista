/*
  Warnings:

  - A unique constraint covering the columns `[obsPublicId]` on the table `RunOverlay` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "RunOverlay" ADD COLUMN     "obsPublicId" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "RunOverlay_obsPublicId_key" ON "RunOverlay"("obsPublicId");
