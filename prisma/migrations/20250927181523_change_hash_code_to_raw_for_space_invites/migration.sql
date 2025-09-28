/*
  Warnings:

  - You are about to drop the column `hashCode` on the `space_invites` table. All the data in the column will be lost.
  - Added the required column `raw` to the `space_invites` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "space_invites" DROP COLUMN "hashCode",
ADD COLUMN     "raw" TEXT NOT NULL;
