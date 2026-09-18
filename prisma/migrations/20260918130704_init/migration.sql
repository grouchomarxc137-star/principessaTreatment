-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PRINCIPESSA', 'PRINCIPE');

-- CreateEnum
CREATE TYPE "Mode" AS ENUM ('DISTANCE', 'TOGETHER');

-- CreateEnum
CREATE TYPE "CardMode" AS ENUM ('ANY', 'DISTANCE', 'TOGETHER');

-- CreateEnum
CREATE TYPE "Feeling" AS ENUM ('OVERWHELMED', 'LOW_ENERGY', 'NEEDY', 'UPSET', 'MISSING_HIM', 'OKAY', 'GOOD');

-- CreateEnum
CREATE TYPE "RequestKind" AS ENUM ('CARD', 'CANT_ASK', 'HANDLE_ME', 'SOS', 'OFFER');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ResponseKind" AS ENUM ('ON_IT', 'LITTLE_BIT', 'CANT_NOW');

-- CreateEnum
CREATE TYPE "Helped" AS ENUM ('A_LOT', 'A_LITTLE', 'NOT_REALLY');

-- CreateEnum
CREATE TYPE "DiscoveryStatus" AS ENUM ('SUGGESTED', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PreferenceKind" AS ENUM ('DO', 'DONT');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('OPEN', 'CLAIMED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('ACTIVE', 'DONE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('PHOTO', 'VOICE', 'VIDEO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrentState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "feeling" "Feeling",
    "feelingSince" TIMESTAMP(3),
    "mode" "Mode" NOT NULL DEFAULT 'DISTANCE',
    "modeSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrentState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareCard" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "forHim" TEXT NOT NULL,
    "mode" "CardMode" NOT NULL DEFAULT 'ANY',
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareRequest" (
    "id" TEXT NOT NULL,
    "kind" "RequestKind" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',
    "cardId" TEXT,
    "offerId" TEXT,
    "feeling" "Feeling",
    "mode" "Mode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "aftercareSkipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CareRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareResponse" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "kind" "ResponseKind" NOT NULL,
    "chosenCardId" TEXT,
    "mediaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aftercare" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "helped" "Helped" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aftercare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discovery" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "feeling" "Feeling",
    "cardId" TEXT,
    "handleMe" BOOLEAN NOT NULL DEFAULT false,
    "sampleSize" INTEGER NOT NULL,
    "status" "DiscoveryStatus" NOT NULL DEFAULT 'SUGGESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Discovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preference" (
    "id" TEXT NOT NULL,
    "kind" "PreferenceKind" NOT NULL,
    "text" TEXT NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "activeSince" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenOffer" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "OpenOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MysteryMission" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "mode" "Mode" NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "MysteryMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_role_key" ON "User"("role");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CareRequest_offerId_key" ON "CareRequest"("offerId");

-- CreateIndex
CREATE INDEX "CareRequest_status_createdAt_idx" ON "CareRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CareResponse_requestId_createdAt_idx" ON "CareResponse"("requestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Aftercare_requestId_key" ON "Aftercare"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Discovery_key_key" ON "Discovery"("key");

-- CreateIndex
CREATE INDEX "OpenOffer_status_expiresAt_idx" ON "OpenOffer"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "Media_storageKey_key" ON "Media"("storageKey");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareRequest" ADD CONSTRAINT "CareRequest_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CareCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareRequest" ADD CONSTRAINT "CareRequest_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "OpenOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareResponse" ADD CONSTRAINT "CareResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CareRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareResponse" ADD CONSTRAINT "CareResponse_chosenCardId_fkey" FOREIGN KEY ("chosenCardId") REFERENCES "CareCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareResponse" ADD CONSTRAINT "CareResponse_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aftercare" ADD CONSTRAINT "Aftercare_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CareRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discovery" ADD CONSTRAINT "Discovery_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CareCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
