/*
  Warnings:

  - You are about to drop the `space_invites` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "space_invites" DROP CONSTRAINT "space_invites_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "space_invites" DROP CONSTRAINT "space_invites_spaceId_fkey";

-- DropTable
DROP TABLE "space_invites";

-- CreateTable
CREATE TABLE "space_invite_codes" (
    "id" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "spaceId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "space_invite_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "space_invite_codes_spaceId_idx" ON "space_invite_codes"("spaceId");

-- CreateIndex
CREATE INDEX "space_invite_codes_expiresAt_idx" ON "space_invite_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "space_invite_codes_createdByUserId_idx" ON "space_invite_codes"("createdByUserId");

-- AddForeignKey
ALTER TABLE "space_invite_codes" ADD CONSTRAINT "space_invite_codes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_invite_codes" ADD CONSTRAINT "space_invite_codes_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
