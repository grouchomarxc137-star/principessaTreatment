-- AlterTable
ALTER TABLE "MysteryMission" ADD COLUMN     "wishId" TEXT;

-- CreateTable
CREATE TABLE "Wish" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "mode" "CardMode" NOT NULL DEFAULT 'ANY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wish_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MysteryMission" ADD CONSTRAINT "MysteryMission_wishId_fkey" FOREIGN KEY ("wishId") REFERENCES "Wish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
