-- DropForeignKey
ALTER TABLE "space_members" DROP CONSTRAINT "space_members_spaceId_fkey";

-- AddForeignKey
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
