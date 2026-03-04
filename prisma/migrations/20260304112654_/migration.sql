/*
  Warnings:

  - You are about to drop the column `detachedFromEventId` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `detachedFromOccurrenceStart` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `isAllDay` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `space_invite_codes` table. All the data in the column will be lost.
  - You are about to drop the column `maxUses` on the `space_invite_codes` table. All the data in the column will be lost.
  - You are about to drop the column `usedCount` on the `space_invite_codes` table. All the data in the column will be lost.
  - You are about to drop the `event_exceptions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "event_exceptions" DROP CONSTRAINT "event_exceptions_eventId_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_detachedFromEventId_fkey";

-- DropIndex
DROP INDEX "events_detachedFromEventId_detachedFromOccurrenceStart_key";

-- DropIndex
DROP INDEX "events_spaceId_detachedFromEventId_idx";

-- DropIndex
DROP INDEX "space_invite_codes_expiresAt_idx";

-- AlterTable
ALTER TABLE "events" DROP COLUMN "detachedFromEventId",
DROP COLUMN "detachedFromOccurrenceStart",
DROP COLUMN "isAllDay",
DROP COLUMN "location";

-- AlterTable
ALTER TABLE "space_invite_codes" DROP COLUMN "expiresAt",
DROP COLUMN "maxUses",
DROP COLUMN "usedCount";

-- DropTable
DROP TABLE "event_exceptions";

-- CreateIndex
CREATE INDEX "events_spaceId_idx" ON "events"("spaceId");
