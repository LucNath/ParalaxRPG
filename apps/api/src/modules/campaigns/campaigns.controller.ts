import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createCampaignSchema, updateCampaignSchema, listCampaignsQuerySchema, type CreateCampaignInput, type UpdateCampaignInput, type ListSystemsQuery } from '@paralax/contracts';
import { SchemaPipe } from '../../common/schema.pipe';
import { Identity, Public, type AuthIdentity } from '../auth/auth.decorators';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}
  @Get('mine')
  mine(@Identity() identity: AuthIdentity, @Query(new SchemaPipe(listCampaignsQuerySchema)) query: ListSystemsQuery, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.campaigns.list(query, identity.userId);
  }
  @Get('mine/:id')
  owned(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.campaigns.detail(id, identity.userId);
  }
  @Public()
  @Get('public')
  catalog(@Query(new SchemaPipe(listCampaignsQuerySchema)) query: ListSystemsQuery, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.campaigns.list(query);
  }
  @Post()
  create(@Identity() identity: AuthIdentity, @Body(new SchemaPipe(createCampaignSchema)) input: CreateCampaignInput, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.campaigns.create(identity.userId, input);
  }
  @Put(':id')
  update(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(updateCampaignSchema)) input: UpdateCampaignInput, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.campaigns.update(identity.userId, id, input);
  }
  @Public()
  @Get(':id')
  detail(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.campaigns.publicDetail(id);
  }
}
