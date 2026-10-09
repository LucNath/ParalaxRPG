CREATE TABLE "SessionChat" (
  "sessionId" TEXT PRIMARY KEY REFERENCES "GameSession"("id") ON DELETE CASCADE,
  "lastSequence" INTEGER NOT NULL DEFAULT 0 CHECK ("lastSequence" >= 0)
);
CREATE TABLE "SessionMessage" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES "GameSession"("id") ON DELETE CASCADE,
  "senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "requestId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL CHECK ("sequence" > 0),
  "content" TEXT NOT NULL CHECK (length(btrim("content")) BETWEEN 1 AND 2000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "SessionMessage_sessionId_sequence_key" ON "SessionMessage"("sessionId", "sequence");
CREATE UNIQUE INDEX "SessionMessage_sessionId_senderId_requestId_key" ON "SessionMessage"("sessionId", "senderId", "requestId");
CREATE TABLE "SessionChatRead" (
  "sessionId" TEXT NOT NULL REFERENCES "GameSession"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "sequence" INTEGER NOT NULL DEFAULT 0 CHECK ("sequence" >= 0),
  PRIMARY KEY ("sessionId", "userId")
);
CREATE TABLE "SessionChatNotification" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL REFERENCES "GameSession"("id") ON DELETE CASCADE,
  "recipientId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "sequence" INTEGER NOT NULL CHECK ("sequence" > 0),
  "version" INTEGER NOT NULL DEFAULT 1 CHECK ("version" > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "readAt" TIMESTAMP(3),
  CHECK ("senderId" <> "recipientId")
);
CREATE UNIQUE INDEX "SessionChatNotification_sessionId_recipientId_key" ON "SessionChatNotification"("sessionId", "recipientId");
CREATE INDEX "SessionChatNotification_recipientId_updatedAt_idx" ON "SessionChatNotification"("recipientId", "updatedAt");

-- Membership removal is respected by every API version during a rolling deployment.
CREATE FUNCTION clear_removed_session_chat() RETURNS TRIGGER AS $$
BEGIN
  IF NEW."status" = 'REMOVED' AND OLD."status" <> 'REMOVED' THEN
    DELETE FROM "SessionChatNotification" n USING "GameSession" s
      WHERE n."sessionId" = s."id" AND s."campaignId" = NEW."campaignId" AND n."recipientId" = NEW."userId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER clear_removed_session_chat AFTER UPDATE OF "status" ON "CampaignMember"
  FOR EACH ROW EXECUTE FUNCTION clear_removed_session_chat();
