/*
  Warnings:

  - You are about to drop the column `note` on the `space_link_codes` table. All the data in the column will be lost.
  - You are about to drop the column `purpose` on the `space_link_codes` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "space_tg_chats_spaceId_chatTgId_messageThreadId_key";

-- AlterTable
ALTER TABLE "space_link_codes" DROP COLUMN "note",
DROP COLUMN "purpose";
