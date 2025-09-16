-- CreateEnum
CREATE TYPE "TgChatType" AS ENUM ('PRIVATE', 'GROUP', 'SUPERGROUP', 'CHANNEL');

-- CreateTable
CREATE TABLE "space_tg_chats" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "chatTgId" BIGINT NOT NULL,
    "chatType" "TgChatType" NOT NULL,
    "chatTitle" TEXT,
    "messageThreadId" INTEGER,
    "initiatedByTgId" BIGINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "space_tg_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_link_codes" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "purpose" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_link_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "space_tg_chats_chatTgId_idx" ON "space_tg_chats"("chatTgId");

-- CreateIndex
CREATE UNIQUE INDEX "space_tg_chats_spaceId_chatTgId_messageThreadId_key" ON "space_tg_chats"("spaceId", "chatTgId", "messageThreadId");

-- CreateIndex
CREATE UNIQUE INDEX "space_link_codes_hash_key" ON "space_link_codes"("hash");

-- CreateIndex
CREATE INDEX "space_link_codes_spaceId_idx" ON "space_link_codes"("spaceId");

-- CreateIndex
CREATE INDEX "space_link_codes_expiresAt_idx" ON "space_link_codes"("expiresAt");

-- AddForeignKey
ALTER TABLE "space_tg_chats" ADD CONSTRAINT "space_tg_chats_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_link_codes" ADD CONSTRAINT "space_link_codes_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_link_codes" ADD CONSTRAINT "space_link_codes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
