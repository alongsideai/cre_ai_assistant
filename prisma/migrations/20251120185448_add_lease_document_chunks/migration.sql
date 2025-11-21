-- CreateTable
CREATE TABLE "LeaseDocumentChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leaseId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaseDocumentChunk_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LeaseDocumentChunk_leaseId_idx" ON "LeaseDocumentChunk"("leaseId");

-- CreateIndex
CREATE INDEX "LeaseDocumentChunk_leaseId_chunkIndex_idx" ON "LeaseDocumentChunk"("leaseId", "chunkIndex");
