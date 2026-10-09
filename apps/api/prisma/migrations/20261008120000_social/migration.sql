BEGIN;
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');
CREATE TABLE "Friendship" (
  "id" TEXT PRIMARY KEY,
  "lowId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "highId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "initiatorId" TEXT NOT NULL,
  "blockedById" TEXT,
  "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
  "lastSequence" INTEGER NOT NULL DEFAULT 0,
  "lowReadSequence" INTEGER NOT NULL DEFAULT 0,
  "highReadSequence" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Friendship_pair_check" CHECK ("lowId" < "highId" AND "initiatorId" IN ("lowId", "highId")),
  CONSTRAINT "Friendship_block_check" CHECK (("status" = 'BLOCKED' AND "blockedById" IS NOT NULL AND "blockedById" IN ("lowId", "highId")) OR ("status" <> 'BLOCKED' AND "blockedById" IS NULL)),
  CONSTRAINT "Friendship_sequence_check" CHECK ("lowReadSequence" BETWEEN 0 AND "lastSequence" AND "highReadSequence" BETWEEN 0 AND "lastSequence"),
  CONSTRAINT "Friendship_lowId_highId_key" UNIQUE ("lowId", "highId")
);
CREATE INDEX "Friendship_lowId_updatedAt_idx" ON "Friendship"("lowId", "updatedAt");
CREATE INDEX "Friendship_highId_updatedAt_idx" ON "Friendship"("highId", "updatedAt");
CREATE TABLE "DirectMessage" (
  "id" TEXT PRIMARY KEY,
  "friendshipId" TEXT NOT NULL REFERENCES "Friendship"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "requestId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL CHECK ("sequence" > 0),
  "content" TEXT NOT NULL CHECK (char_length("content") BETWEEN 1 AND 2000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DirectMessage_friendshipId_sequence_key" UNIQUE ("friendshipId", "sequence"),
  CONSTRAINT "DirectMessage_friendshipId_senderId_requestId_key" UNIQUE ("friendshipId", "senderId", "requestId")
);
COMMIT;
