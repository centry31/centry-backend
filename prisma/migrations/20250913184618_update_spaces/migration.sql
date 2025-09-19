/*
  Warnings:

  - A unique constraint covering the columns `[spaceId,chatTgId,messageThreadId]` on the table `space_tg_chats` will be added. If there are existing duplicate values, this will fail.
  - Made the column `messageThreadId` on table `space_tg_chats` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "space_tg_chats" ALTER COLUMN "messageThreadId" SET NOT NULL,
ALTER COLUMN "messageThreadId" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "space_link_codes_createdByUserId_idx" ON "space_link_codes"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "space_tg_chats_spaceId_chatTgId_messageThreadId_key" ON "space_tg_chats"("spaceId", "chatTgId", "messageThreadId");
