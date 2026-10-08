CREATE TABLE "UserAchievement" (
  "userId" TEXT NOT NULL, "achievementId" TEXT NOT NULL,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "ruleVersion" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId", "achievementId"),
  CONSTRAINT "UserAchievement_rule_check" CHECK ("ruleVersion" = 1 AND "achievementId" IN ('identity','first-character','first-campaign','first-roll')),
  CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "UserCosmetic" (
  "userId" TEXT NOT NULL, "cosmeticId" TEXT NOT NULL, "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserCosmetic_pkey" PRIMARY KEY ("userId", "cosmeticId"),
  CONSTRAINT "UserCosmetic_catalog_check" CHECK ("cosmeticId" IN ('forest-refuge','floating-citadel','violet-portal','dice-path')),
  CONSTRAINT "UserCosmetic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE "Profile" ADD COLUMN "backgroundId" TEXT, ADD COLUMN "avatarFrameId" TEXT;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_background_category_check" CHECK ("backgroundId" IS NULL OR "backgroundId" IN ('forest-refuge','floating-citadel'));
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_frame_category_check" CHECK ("avatarFrameId" IS NULL OR "avatarFrameId" IN ('violet-portal','dice-path'));
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_backgroundId_fkey" FOREIGN KEY ("userId", "backgroundId") REFERENCES "UserCosmetic"("userId", "cosmeticId") ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_avatarFrameId_fkey" FOREIGN KEY ("userId", "avatarFrameId") REFERENCES "UserCosmetic"("userId", "cosmeticId") ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

-- Backfill only facts present in the database; never infer session attendance.
INSERT INTO "UserAchievement" ("userId","achievementId","earnedAt")
SELECT "userId", 'identity', CURRENT_TIMESTAMP FROM "Profile" WHERE length(trim(bio)) > 0 AND "avatarKey" IS NOT NULL
UNION ALL SELECT "ownerId", 'first-character', min("createdAt") FROM "Character" GROUP BY "ownerId"
UNION ALL SELECT "ownerId", 'first-campaign', min("createdAt") FROM "Campaign" GROUP BY "ownerId"
UNION ALL SELECT r."actorId", 'first-roll', min(r."createdAt") FROM "DiceRoll" r INNER JOIN "User" u ON u.id=r."actorId" GROUP BY r."actorId";
INSERT INTO "UserCosmetic" ("userId","cosmeticId","earnedAt")
SELECT "userId", CASE "achievementId" WHEN 'identity' THEN 'violet-portal' WHEN 'first-character' THEN 'forest-refuge' WHEN 'first-campaign' THEN 'floating-citadel' WHEN 'first-roll' THEN 'dice-path' END, "earnedAt" FROM "UserAchievement";
