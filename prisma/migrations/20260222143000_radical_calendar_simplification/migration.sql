-- Drop legacy recurrence storage.
DROP TABLE IF EXISTS "event_overrides";

-- Event reminders: remove index-based planning pointer.
ALTER TABLE "event_reminders"
DROP COLUMN IF EXISTS "nextOrderIndex";

-- Events: remove legacy frequency model and add RRULE model.
ALTER TABLE "events"
DROP COLUMN IF EXISTS "frequency",
DROP COLUMN IF EXISTS "repeatUntil",
ADD COLUMN "rrule" TEXT,
ADD COLUMN "timeZone" TEXT,
ADD COLUMN "detachedFromEventId" TEXT,
ADD COLUMN "detachedFromOccurrenceStart" TIMESTAMP(3);

UPDATE "events"
SET "timeZone" = 'UTC'
WHERE "timeZone" IS NULL;

ALTER TABLE "events"
ALTER COLUMN "timeZone" SET NOT NULL;

-- Event exceptions (EXDATE-like semantics).
CREATE TABLE IF NOT EXISTS "event_exceptions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "occurrenceStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "events_detachedFromEventId_detachedFromOccurrenceStart_key"
ON "events"("detachedFromEventId", "detachedFromOccurrenceStart");

CREATE INDEX IF NOT EXISTS "events_spaceId_detachedFromEventId_idx"
ON "events"("spaceId", "detachedFromEventId");

CREATE UNIQUE INDEX IF NOT EXISTS "event_exceptions_eventId_occurrenceStart_key"
ON "event_exceptions"("eventId", "occurrenceStart");

CREATE INDEX IF NOT EXISTS "event_exceptions_eventId_occurrenceStart_idx"
ON "event_exceptions"("eventId", "occurrenceStart");

ALTER TABLE "events"
ADD CONSTRAINT "events_detachedFromEventId_fkey"
FOREIGN KEY ("detachedFromEventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_exceptions"
ADD CONSTRAINT "event_exceptions_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Pre-release reset for calendar data.
TRUNCATE TABLE "event_exceptions", "event_reminders", "events" RESTART IDENTITY CASCADE;

-- Drop enum no longer used.
DROP TYPE IF EXISTS "Frequency";
