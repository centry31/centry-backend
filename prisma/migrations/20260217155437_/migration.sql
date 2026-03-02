/*
  Warnings:

  - You are about to drop the column `rruleString` on the `events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "rruleString",
ADD COLUMN     "rrule" TEXT;
