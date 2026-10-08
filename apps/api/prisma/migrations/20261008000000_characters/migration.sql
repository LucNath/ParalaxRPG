CREATE UNIQUE INDEX "Campaign_id_systemVersionId_key" ON "Campaign"("id", "systemVersionId");
CREATE TABLE "Character" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "systemVersionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "story" TEXT NOT NULL DEFAULT '',
  "level" INTEGER,
  "values" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Character_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Character_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "Character_level_check" CHECK ("level" IS NULL OR "level" BETWEEN 1 AND 1000000)
);
CREATE TABLE "CharacterChange" (
  "id" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CharacterChange_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Character_ownerId_updatedAt_idx" ON "Character"("ownerId", "updatedAt");
CREATE INDEX "Character_campaignId_updatedAt_idx" ON "Character"("campaignId", "updatedAt");
CREATE INDEX "Character_systemVersionId_idx" ON "Character"("systemVersionId");
CREATE UNIQUE INDEX "CharacterChange_characterId_revision_key" ON "CharacterChange"("characterId", "revision");
ALTER TABLE "Character" ADD CONSTRAINT "Character_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Character" ADD CONSTRAINT "Character_campaignId_systemVersionId_fkey" FOREIGN KEY ("campaignId", "systemVersionId") REFERENCES "Campaign"("id", "systemVersionId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Character" ADD CONSTRAINT "Character_systemVersionId_fkey" FOREIGN KEY ("systemVersionId") REFERENCES "SystemVersion"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CharacterChange" ADD CONSTRAINT "CharacterChange_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
