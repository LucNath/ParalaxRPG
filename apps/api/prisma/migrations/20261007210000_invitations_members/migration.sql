CREATE TYPE "CampaignMemberStatus" AS ENUM ('ACTIVE', 'REMOVED');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');
CREATE TABLE "CampaignMember" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "CampaignMemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "removedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignMember_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CampaignInvitation" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "inviterId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "respondedAt" TIMESTAMP(3),
  CONSTRAINT "CampaignInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CampaignMember_campaignId_userId_key" ON "CampaignMember"("campaignId", "userId");
CREATE INDEX "CampaignMember_userId_status_idx" ON "CampaignMember"("userId", "status");
CREATE INDEX "CampaignMember_campaignId_status_idx" ON "CampaignMember"("campaignId", "status");
CREATE UNIQUE INDEX "CampaignInvitation_pending_recipient_key" ON "CampaignInvitation"("campaignId", "recipientId") WHERE "status" = 'PENDING';
CREATE INDEX "CampaignInvitation_recipientId_createdAt_idx" ON "CampaignInvitation"("recipientId", "createdAt");
CREATE INDEX "CampaignInvitation_campaignId_createdAt_idx" ON "CampaignInvitation"("campaignId", "createdAt");
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignInvitation" ADD CONSTRAINT "CampaignInvitation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignInvitation" ADD CONSTRAINT "CampaignInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignInvitation" ADD CONSTRAINT "CampaignInvitation_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
