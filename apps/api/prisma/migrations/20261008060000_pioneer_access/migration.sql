BEGIN;
-- Serialize backfill with account creation, including older API deployments.
LOCK TABLE "User", "Profile" IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE "PioneerAccessSlot" (
  "slot" INTEGER NOT NULL PRIMARY KEY,
  "userId" TEXT UNIQUE REFERENCES "User"(id) ON DELETE SET NULL ON UPDATE CASCADE,
  "grantedAt" TIMESTAMP(3),
  CONSTRAINT "PioneerAccessSlot_limit_check" CHECK ("slot" BETWEEN 1 AND 10),
  CONSTRAINT "PioneerAccessSlot_assignment_check" CHECK ("grantedAt" IS NOT NULL OR "userId" IS NULL)
);
WITH ranked AS (
  SELECT id, "createdAt", row_number() OVER (ORDER BY "createdAt", id) AS rank FROM "User"
)
INSERT INTO "PioneerAccessSlot" ("slot","userId","grantedAt")
SELECT slots.slot, ranked.id, ranked."createdAt" FROM generate_series(1,10) AS slots(slot)
LEFT JOIN ranked ON ranked.rank=slots.slot;
UPDATE "Profile" p SET "allCosmeticsUnlocked"=true
FROM "PioneerAccessSlot" s WHERE s."userId"=p."userId";
INSERT INTO "UserCosmetic" ("userId","cosmeticId")
SELECT p."userId", catalog.id FROM "Profile" p CROSS JOIN (VALUES ('forest-refuge'),('floating-citadel'),('violet-portal'),('dice-path'),('jade-sanctuary'),('ember-citadel'),('jade-orbit'),('ember-crown')) AS catalog(id)
WHERE p."allCosmeticsUnlocked"=true ON CONFLICT DO NOTHING;

-- A claimed slot remains consumed after deletion: grantedAt is never cleared.
-- Waiting for the earliest available row prevents concurrent registrations from overbooking.
CREATE FUNCTION assign_pioneer_slot() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE available_slot INTEGER;
BEGIN
  SELECT "slot" INTO available_slot FROM "PioneerAccessSlot"
  WHERE "grantedAt" IS NULL ORDER BY "slot" LIMIT 1 FOR UPDATE;
  IF available_slot IS NOT NULL THEN
    UPDATE "PioneerAccessSlot" SET "userId"=NEW.id,"grantedAt"=clock_timestamp() WHERE "slot"=available_slot;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER user_pioneer_access AFTER INSERT ON "User" FOR EACH ROW EXECUTE FUNCTION assign_pioneer_slot();

CREATE FUNCTION apply_pioneer_profile_access() RETURNS trigger LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "PioneerAccessSlot" WHERE "userId"=NEW."userId") THEN
    NEW."allCosmeticsUnlocked" := true;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profile_pioneer_access BEFORE INSERT ON "Profile" FOR EACH ROW EXECUTE FUNCTION apply_pioneer_profile_access();
COMMIT;
