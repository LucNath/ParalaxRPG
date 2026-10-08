BEGIN;
ALTER TABLE "UserCosmetic" DROP CONSTRAINT "UserCosmetic_catalog_check";
ALTER TABLE "UserCosmetic" ADD CONSTRAINT "UserCosmetic_catalog_check" CHECK ("cosmeticId" IN ('forest-refuge','floating-citadel','violet-portal','dice-path','jade-sanctuary','ember-citadel','jade-orbit','ember-crown'));
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_background_category_check", DROP CONSTRAINT "Profile_frame_category_check";
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_background_category_check" CHECK ("backgroundId" IS NULL OR "backgroundId" IN ('forest-refuge','floating-citadel','jade-sanctuary','ember-citadel'));
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_frame_category_check" CHECK ("avatarFrameId" IS NULL OR "avatarFrameId" IN ('violet-portal','dice-path','jade-orbit','ember-crown'));
-- Existing achievements also grant their new reward, without changing earned dates or equipped items.
INSERT INTO "UserCosmetic" ("userId","cosmeticId","earnedAt")
SELECT "userId", CASE "achievementId" WHEN 'identity' THEN 'jade-orbit' WHEN 'first-character' THEN 'jade-sanctuary' WHEN 'first-campaign' THEN 'ember-citadel' WHEN 'first-roll' THEN 'ember-crown' END, "earnedAt" FROM "UserAchievement"
ON CONFLICT DO NOTHING;
-- The administrative entitlement continues to cover the whole catalog.
INSERT INTO "UserCosmetic" ("userId","cosmeticId")
SELECT p."userId", catalog.id FROM "Profile" p CROSS JOIN (VALUES ('forest-refuge'),('floating-citadel'),('violet-portal'),('dice-path'),('jade-sanctuary'),('ember-citadel'),('jade-orbit'),('ember-crown')) AS catalog(id)
WHERE p."allCosmeticsUnlocked" = true ON CONFLICT DO NOTHING;
COMMIT;
