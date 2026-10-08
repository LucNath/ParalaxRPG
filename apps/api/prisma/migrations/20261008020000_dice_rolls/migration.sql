CREATE FUNCTION "dice_roll_sum"(integer[]) RETURNS integer
LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE
AS 'SELECT COALESCE(SUM(value), 0)::integer FROM unnest($1) AS value';

CREATE TABLE "DiceRoll" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "actorId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "request" JSONB NOT NULL,
  "actor" JSONB NOT NULL,
  "character" JSONB,
  "count" INTEGER NOT NULL,
  "sides" INTEGER NOT NULL,
  "manualModifier" INTEGER NOT NULL,
  "fieldModifier" INTEGER NOT NULL,
  "modifier" INTEGER NOT NULL,
  "results" INTEGER[] NOT NULL,
  "total" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiceRoll_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiceRoll_values_check" CHECK (
    "sequence" > 0 AND "count" BETWEEN 1 AND 50 AND "sides" BETWEEN 2 AND 1000
    AND "manualModifier" BETWEEN -1000000 AND 1000000
    AND "fieldModifier" BETWEEN -1000000 AND 1000000
    AND "modifier" = "manualModifier" + "fieldModifier"
    AND cardinality("results") = "count" AND array_ndims("results") = 1
    AND array_position("results", NULL) IS NULL
    AND 1 <= ALL("results") AND "sides" >= ALL("results")
    AND "total" = "modifier" + "dice_roll_sum"("results")
  )
);
CREATE UNIQUE INDEX "DiceRoll_sessionId_sequence_key" ON "DiceRoll"("sessionId", "sequence");
CREATE UNIQUE INDEX "DiceRoll_sessionId_actorId_requestId_key" ON "DiceRoll"("sessionId", "actorId", "requestId");
ALTER TABLE "DiceRoll" ADD CONSTRAINT "DiceRoll_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
