/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `spaces` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_spaceId_fkey";

-- DropForeignKey
ALTER TABLE "space_members" DROP CONSTRAINT "space_members_spaceId_fkey";

-- AlterTable
ALTER TABLE "spaces" DROP COLUMN "deletedAt";

-- AddForeignKey
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
