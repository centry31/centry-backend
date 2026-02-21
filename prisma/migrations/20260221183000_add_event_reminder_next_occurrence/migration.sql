-- AlterTable
ALTER TABLE "event_reminders"
ADD COLUMN "nextOrderIndex" INTEGER,
ADD COLUMN "nextOccurrenceStart" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "event_reminders_nextOccurrenceStart_idx" ON "event_reminders"("nextOccurrenceStart");
