BEGIN;
LOCK TABLE "Friendship", "DirectMessage" IN SHARE ROW EXCLUSIVE MODE;
CREATE TYPE "SocialNotificationKind" AS ENUM ('REQUEST', 'ACCEPTED', 'MESSAGE');
CREATE TABLE "SocialNotification" (
  "id" TEXT PRIMARY KEY,
  "recipientId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "friendshipId" TEXT NOT NULL REFERENCES "Friendship"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "kind" "SocialNotificationKind" NOT NULL,
  "sequence" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "SocialNotification_sequence_check" CHECK (("kind" = 'MESSAGE' AND "sequence" > 0) OR ("kind" <> 'MESSAGE' AND "sequence" = 0)),
  CONSTRAINT "SocialNotification_friendshipId_recipientId_kind_key" UNIQUE ("friendshipId", "recipientId", "kind")
);
CREATE INDEX "SocialNotification_recipientId_updatedAt_idx" ON "SocialNotification"("recipientId", "updatedAt");

-- Pending requests and genuinely unread messages already present at upgrade.
INSERT INTO "SocialNotification" ("id", "recipientId", "friendshipId", "kind", "updatedAt")
SELECT gen_random_uuid()::text, CASE WHEN "initiatorId" = "lowId" THEN "highId" ELSE "lowId" END, "id", 'REQUEST', "updatedAt"
FROM "Friendship" WHERE "status" = 'PENDING';
INSERT INTO "SocialNotification" ("id", "recipientId", "friendshipId", "kind", "sequence", "updatedAt")
SELECT gen_random_uuid()::text, pending.recipient, pending.friendship, 'MESSAGE', max(pending.sequence), max(pending.created)
FROM (
  SELECT f."id" friendship, CASE WHEN m."senderId" = f."lowId" THEN f."highId" ELSE f."lowId" END recipient, m."sequence" sequence, m."createdAt" created
  FROM "DirectMessage" m JOIN "Friendship" f ON f."id" = m."friendshipId"
  WHERE f."status" = 'ACCEPTED' AND m."senderId" IN (f."lowId", f."highId")
    AND m."sequence" > CASE WHEN m."senderId" = f."lowId" THEN f."highReadSequence" ELSE f."lowReadSequence" END
) pending GROUP BY pending.friendship, pending.recipient;

CREATE FUNCTION notify_friendship_activity() RETURNS TRIGGER LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
BEGIN
  IF NEW."status" IN ('DECLINED', 'BLOCKED') THEN
    DELETE FROM "SocialNotification" WHERE "friendshipId" = NEW."id";
    RETURN NEW;
  END IF;
  IF NEW."status" = 'PENDING' AND (TG_OP = 'INSERT' OR OLD."status" <> 'PENDING' OR OLD."initiatorId" <> NEW."initiatorId") THEN
    INSERT INTO "SocialNotification" ("id", "recipientId", "friendshipId", "kind", "updatedAt")
    VALUES (gen_random_uuid()::text, CASE WHEN NEW."initiatorId" = NEW."lowId" THEN NEW."highId" ELSE NEW."lowId" END, NEW."id", 'REQUEST', clock_timestamp())
    ON CONFLICT ("friendshipId", "recipientId", "kind") DO UPDATE SET "readAt" = NULL, "updatedAt" = EXCLUDED."updatedAt", "version" = "SocialNotification"."version" + 1;
  END IF;
  IF NEW."status" = 'ACCEPTED' THEN
    DELETE FROM "SocialNotification" WHERE "friendshipId" = NEW."id" AND "kind" = 'REQUEST';
    IF TG_OP = 'INSERT' OR OLD."status" <> 'ACCEPTED' THEN
      INSERT INTO "SocialNotification" ("id", "recipientId", "friendshipId", "kind", "updatedAt")
      VALUES (gen_random_uuid()::text, NEW."initiatorId", NEW."id", 'ACCEPTED', clock_timestamp())
      ON CONFLICT ("friendshipId", "recipientId", "kind") DO UPDATE SET "readAt" = NULL, "updatedAt" = EXCLUDED."updatedAt", "version" = "SocialNotification"."version" + 1;
    END IF;
    UPDATE "SocialNotification" SET "readAt" = COALESCE("readAt", clock_timestamp())
    WHERE "friendshipId" = NEW."id" AND "kind" = 'MESSAGE' AND (
      ("recipientId" = NEW."lowId" AND "sequence" <= NEW."lowReadSequence") OR
      ("recipientId" = NEW."highId" AND "sequence" <= NEW."highReadSequence"));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER "friendship_activity_notifications" AFTER INSERT OR UPDATE ON "Friendship" FOR EACH ROW EXECUTE FUNCTION notify_friendship_activity();

CREATE FUNCTION notify_direct_message() RETURNS TRIGGER LANGUAGE plpgsql SET search_path FROM CURRENT AS $$
DECLARE pair "Friendship"%ROWTYPE;
BEGIN
  SELECT * INTO pair FROM "Friendship" WHERE "id" = NEW."friendshipId" FOR UPDATE;
  IF pair."status" <> 'ACCEPTED' OR NEW."senderId" NOT IN (pair."lowId", pair."highId") THEN
    RAISE EXCEPTION 'Message requires an accepted friendship and participant sender' USING ERRCODE = '23514';
  END IF;
  INSERT INTO "SocialNotification" ("id", "recipientId", "friendshipId", "kind", "sequence", "updatedAt")
  VALUES (gen_random_uuid()::text, CASE WHEN NEW."senderId" = pair."lowId" THEN pair."highId" ELSE pair."lowId" END, pair."id", 'MESSAGE', NEW."sequence", clock_timestamp())
  ON CONFLICT ("friendshipId", "recipientId", "kind") DO UPDATE SET "readAt" = NULL, "sequence" = EXCLUDED."sequence", "updatedAt" = EXCLUDED."updatedAt", "version" = "SocialNotification"."version" + 1
  WHERE "SocialNotification"."sequence" < EXCLUDED."sequence";
  RETURN NEW;
END; $$;
CREATE TRIGGER "direct_message_notifications" AFTER INSERT ON "DirectMessage" FOR EACH ROW EXECUTE FUNCTION notify_direct_message();
COMMIT;
