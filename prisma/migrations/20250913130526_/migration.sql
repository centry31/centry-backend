/*
  Warnings:

  - You are about to drop the column `hash` on the `space_link_codes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[hashCode]` on the table `space_link_codes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hashCode` to the `space_link_codes` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "space_link_codes_hash_key";

-- AlterTable
ALTER TABLE "space_link_codes" DROP COLUMN "hash",
ADD COLUMN     "hashCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "space_link_codes_hashCode_key" ON "space_link_codes"("hashCode");
