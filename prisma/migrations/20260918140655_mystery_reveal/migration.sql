-- AlterEnum
ALTER TYPE "RequestKind" ADD VALUE 'MYSTERY';

-- AlterTable
ALTER TABLE "CareRequest" ADD COLUMN     "missionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CareRequest_missionId_key" ON "CareRequest"("missionId");

-- AddForeignKey
ALTER TABLE "CareRequest" ADD CONSTRAINT "CareRequest_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "MysteryMission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

