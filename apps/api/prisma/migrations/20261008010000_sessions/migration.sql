CREATE TYPE "GameSessionStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');
CREATE TABLE "GameSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "timeZone" TEXT NOT NULL,
  "visibility" "CampaignVisibility" NOT NULL DEFAULT 'PRIVATE',
  "status" "GameSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "durationSeconds" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameSession_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "GameSession_lifecycle_check" CHECK (
    ("status"='SCHEDULED' AND "startedAt" IS NULL AND "endedAt" IS NULL AND "cancelledAt" IS NULL AND "durationSeconds" IS NULL) OR
    ("status"='LIVE' AND "startedAt" IS NOT NULL AND "endedAt" IS NULL AND "cancelledAt" IS NULL AND "durationSeconds" IS NULL) OR
    ("status"='ENDED' AND "startedAt" IS NOT NULL AND "endedAt" IS NOT NULL AND "endedAt">="startedAt" AND "cancelledAt" IS NULL AND "durationSeconds" IS NOT NULL AND "durationSeconds">=0) OR
    ("status"='CANCELLED' AND "startedAt" IS NULL AND "endedAt" IS NULL AND "cancelledAt" IS NOT NULL AND "durationSeconds" IS NULL)
  ),
  CONSTRAINT "GameSession_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "GameSession_campaignId_scheduledAt_idx" ON "GameSession"("campaignId", "scheduledAt");
CREATE INDEX "GameSession_status_visibility_startedAt_idx" ON "GameSession"("status", "visibility", "startedAt");
CREATE UNIQUE INDEX "GameSession_one_live_per_campaign" ON "GameSession"("campaignId") WHERE "status"='LIVE';
CREATE TABLE "GameSessionChange" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameSessionChange_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GameSessionChange_sessionId_revision_key" ON "GameSessionChange"("sessionId", "revision");
