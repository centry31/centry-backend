-- CreateTable
CREATE TABLE "space_invites" (
    "id" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "hashCode" TEXT NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "spaceId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "space_invites_spaceId_idx" ON "space_invites"("spaceId");

-- CreateIndex
CREATE INDEX "space_invites_expiresAt_idx" ON "space_invites"("expiresAt");

-- CreateIndex
CREATE INDEX "space_invites_createdByUserId_idx" ON "space_invites"("createdByUserId");

-- AddForeignKey
ALTER TABLE "space_invites" ADD CONSTRAINT "space_invites_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_invites" ADD CONSTRAINT "space_invites_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
