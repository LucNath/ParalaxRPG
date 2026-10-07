import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createInvitationSchema, listInvitationsQuerySchema, type CreateInvitationInput, type ListInvitationsQuery } from '@paralax/contracts';
import { SchemaPipe } from '../../common/schema.pipe';
import { Identity, type AuthIdentity } from '../auth/auth.decorators';
import { InvitationsService } from './invitations.service';

@Controller()
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}
  @Get('users/me/invitations')
  inbox(@Identity() identity: AuthIdentity, @Query(new SchemaPipe(listInvitationsQuerySchema)) query: ListInvitationsQuery, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.invitations.list(identity.userId, query);
  }
  @Get('campaigns/:id/invitations')
  sent(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Query(new SchemaPipe(listInvitationsQuerySchema)) query: ListInvitationsQuery, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.invitations.list(identity.userId, query, id);
  }
  @Post('campaigns/:id/invitations')
  create(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(createInvitationSchema)) input: CreateInvitationInput, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.invitations.create(identity.userId, id, input);
  }
  @Post('invitations/:id/accept')
  @HttpCode(200)
  accept(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.invitations.respond(identity.userId, id, 'ACCEPTED');
  }
  @Post('invitations/:id/decline')
  @HttpCode(200)
  decline(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.invitations.respond(identity.userId, id, 'DECLINED');
  }
  @Delete('campaigns/:id/invitations/:invitationId')
  @HttpCode(204)
  revoke(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Param('invitationId', new ParseUUIDPipe({ version: '4' })) invitationId: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.invitations.revoke(identity.userId, id, invitationId);
  }
  @Get('campaigns/:id/members')
  members(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.invitations.members(identity.userId, id);
  }
  @Delete('campaigns/:id/members/:userId')
  @HttpCode(204)
  remove(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.invitations.remove(identity.userId, id, userId);
  }
}
