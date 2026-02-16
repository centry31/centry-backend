/*
  Warnings:

  - You are about to drop the `magic_links` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "magic_links" DROP CONSTRAINT "magic_links_userId_fkey";

-- DropTable
DROP TABLE "magic_links";

-- CreateTable
CREATE TABLE "login_magic_links" (
    "id" TEXT NOT NULL,
    "hashCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_magic_links_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "login_magic_links" ADD CONSTRAINT "login_magic_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
