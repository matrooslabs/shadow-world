/*
  Warnings:

  - You are about to drop the `Endorsement` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Endorsement";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "substrateId" TEXT NOT NULL,
    "nullifierHash" TEXT NOT NULL,
    "merkleRoot" TEXT NOT NULL,
    "proof" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Verification_substrateId_fkey" FOREIGN KEY ("substrateId") REFERENCES "SubstrateRef" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Verification_substrateId_key" ON "Verification"("substrateId");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_nullifierHash_key" ON "Verification"("nullifierHash");
