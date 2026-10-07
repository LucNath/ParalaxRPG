CREATE TYPE "SystemVisibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');
CREATE TABLE "RpgSystem" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "visibility" "SystemVisibility" NOT NULL DEFAULT 'PRIVATE',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RpgSystem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SystemVersion" (
  "id" TEXT NOT NULL,
  "systemId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "definition" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemVersion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RpgSystem_ownerId_updatedAt_idx" ON "RpgSystem"("ownerId", "updatedAt");
CREATE INDEX "RpgSystem_visibility_updatedAt_idx" ON "RpgSystem"("visibility", "updatedAt");
CREATE UNIQUE INDEX "SystemVersion_systemId_number_key" ON "SystemVersion"("systemId", "number");
ALTER TABLE "RpgSystem" ADD CONSTRAINT "RpgSystem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemVersion" ADD CONSTRAINT "SystemVersion_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "RpgSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
