-- DropForeignKey
ALTER TABLE "space_members" DROP CONSTRAINT "space_members_spaceId_fkey";

-- AlterTable
ALTER TABLE "spaces" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
