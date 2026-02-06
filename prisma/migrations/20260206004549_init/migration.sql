-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "username" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SubstrateRef" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerWallet" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubstrateRef_ownerWallet_fkey" FOREIGN KEY ("ownerWallet") REFERENCES "User" ("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Endorsement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "substrateId" TEXT NOT NULL,
    "endorserWallet" TEXT NOT NULL,
    "nullifierHash" TEXT NOT NULL,
    "merkleRoot" TEXT NOT NULL,
    "proof" TEXT NOT NULL,
    "verificationLevel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Endorsement_substrateId_fkey" FOREIGN KEY ("substrateId") REFERENCES "SubstrateRef" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Endorsement_endorserWallet_fkey" FOREIGN KEY ("endorserWallet") REFERENCES "User" ("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "SubstrateRef_ownerWallet_idx" ON "SubstrateRef"("ownerWallet");

-- CreateIndex
CREATE UNIQUE INDEX "Endorsement_nullifierHash_key" ON "Endorsement"("nullifierHash");

-- CreateIndex
CREATE INDEX "Endorsement_substrateId_idx" ON "Endorsement"("substrateId");

-- CreateIndex
CREATE INDEX "Endorsement_endorserWallet_idx" ON "Endorsement"("endorserWallet");
