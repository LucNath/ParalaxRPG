import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({ controllers: [CampaignsController, InvitationsController], providers: [CampaignsService, InvitationsService] })
export class CampaignsModule {}
