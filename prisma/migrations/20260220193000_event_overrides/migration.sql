-- AlterEnum
ALTER TYPE "Frequency" ADD VALUE IF NOT EXISTS 'DOUBLE_WEEKLY';

-- AlterTable
ALTER TABLE "events"
DROP COLUMN IF EXISTS "exDates",
DROP COLUMN IF EXISTS "rrule";

-- DropTable
DROP TABLE IF EXISTS "event_future_mutations";

-- DropTable
DROP TABLE IF EXISTS "event_occurrence_overrides";

-- DropTable
DROP TABLE IF EXISTS "event_overrides";

-- CreateTable
CREATE TABLE "event_overrides" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "offset" INTEGER NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isOffsetOnce" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "event_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_overrides_eventId_orderIndex_key" ON "event_overrides"("eventId", "orderIndex");

-- CreateIndex
CREATE INDEX "event_overrides_eventId_orderIndex_idx" ON "event_overrides"("eventId", "orderIndex");

-- AddForeignKey
ALTER TABLE "event_overrides" ADD CONSTRAINT "event_overrides_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
