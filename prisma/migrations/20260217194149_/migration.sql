-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('NEVER', 'DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "frequency" "Frequency" NOT NULL DEFAULT 'NEVER';
