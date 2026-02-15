/*
  Warnings:

  - You are about to drop the column `ownerID` on the `spaces` table. All the data in the column will be lost.
  - You are about to drop the `space_link_codes` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `ownerId` to the `spaces` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "space_link_codes" DROP CONSTRAINT "space_link_codes_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "space_link_codes" DROP CONSTRAINT "space_link_codes_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "spaces" DROP CONSTRAINT "spaces_ownerID_fkey";

-- AlterTable
ALTER TABLE "spaces" DROP COLUMN "ownerID",
ADD COLUMN     "ownerId" TEXT NOT NULL;

-- DropTable
DROP TABLE "space_link_codes";

-- CreateTable
CREATE TABLE "space_tg_chat_link_codes" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "hashCode" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_tg_chat_link_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "space_tg_chat_link_codes_hashCode_key" ON "space_tg_chat_link_codes"("hashCode");

-- CreateIndex
CREATE INDEX "space_tg_chat_link_codes_spaceId_idx" ON "space_tg_chat_link_codes"("spaceId");

-- CreateIndex
CREATE INDEX "space_tg_chat_link_codes_expiresAt_idx" ON "space_tg_chat_link_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "space_tg_chat_link_codes_createdByUserId_idx" ON "space_tg_chat_link_codes"("createdByUserId");

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_tg_chat_link_codes" ADD CONSTRAINT "space_tg_chat_link_codes_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_tg_chat_link_codes" ADD CONSTRAINT "space_tg_chat_link_codes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
