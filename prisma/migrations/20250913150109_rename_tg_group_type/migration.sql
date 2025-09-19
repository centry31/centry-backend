/*
  Warnings:

  - The values [PRIVATE,GROUP,SUPERGROUP,CHANNEL] on the enum `TgChatType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TgChatType_new" AS ENUM ('private', 'griup', 'supergroup', 'channel');
ALTER TABLE "space_tg_chats" ALTER COLUMN "chatType" TYPE "TgChatType_new" USING ("chatType"::text::"TgChatType_new");
ALTER TYPE "TgChatType" RENAME TO "TgChatType_old";
ALTER TYPE "TgChatType_new" RENAME TO "TgChatType";
DROP TYPE "TgChatType_old";
COMMIT;
