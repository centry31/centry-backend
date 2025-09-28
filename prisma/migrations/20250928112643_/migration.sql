/*
  Warnings:

  - The primary key for the `space_invite_codes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `space_invite_codes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `space_invite_codes` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "space_invite_codes" DROP CONSTRAINT "space_invite_codes_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "space_invite_codes_pkey" PRIMARY KEY ("code");

-- CreateIndex
CREATE UNIQUE INDEX "space_invite_codes_code_key" ON "space_invite_codes"("code");
