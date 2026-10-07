CREATE TYPE "CampaignVisibility" AS ENUM ('PRIVATE', 'PUBLIC');
CREATE TYPE "CampaignStatus" AS ENUM ('PLANNED', 'RECRUITING', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED');

CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "systemVersionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "visibility" "CampaignVisibility" NOT NULL DEFAULT 'PRIVATE',
  "status" "CampaignStatus" NOT NULL DEFAULT 'PLANNED',
  "maxPlayers" INTEGER NOT NULL CHECK ("maxPlayers" BETWEEN 1 AND 20),
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CampaignChange" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "actorId" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignChange_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Campaign_ownerId_updatedAt_idx" ON "Campaign"("ownerId", "updatedAt");
CREATE INDEX "Campaign_visibility_updatedAt_idx" ON "Campaign"("visibility", "updatedAt");
CREATE INDEX "Campaign_systemVersionId_idx" ON "Campaign"("systemVersionId");
CREATE UNIQUE INDEX "CampaignChange_campaignId_revision_key" ON "CampaignChange"("campaignId", "revision");
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_systemVersionId_fkey" FOREIGN KEY ("systemVersionId") REFERENCES "SystemVersion"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CampaignChange" ADD CONSTRAINT "CampaignChange_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
