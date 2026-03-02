-- AlterTable
ALTER TABLE "events" ADD COLUMN "duration" INTEGER;

-- Backfill duration in minutes from old range.
UPDATE "events"
SET "duration" = GREATEST(
	1,
	CEIL(EXTRACT(EPOCH FROM ("end" - "start")) / 60.0)::INTEGER
)
WHERE "duration" IS NULL;

ALTER TABLE "events" ALTER COLUMN "duration" SET NOT NULL;
ALTER TABLE "events" DROP COLUMN "end";
