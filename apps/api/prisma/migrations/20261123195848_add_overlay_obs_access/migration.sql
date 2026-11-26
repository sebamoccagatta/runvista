/*
  Warnings:

  - A unique constraint covering the columns `[obsTokenHash]` on the table `RunOverlay` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "RunOverlay" ADD COLUMN     "obsTokenHash" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "RunOverlay_obsTokenHash_key" ON "RunOverlay"("obsTokenHash");
