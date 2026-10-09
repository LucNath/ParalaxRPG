import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { socialListSchema, socialSearchSchema, friendRequestSchema, friendActionSchema, directMessageSchema, messageListSchema, messageReadSchema,
  type SocialListQuery, type SocialSearchQuery, type FriendRequestInput, type FriendActionInput, type DirectMessageInput, type MessageListQuery, type MessageReadInput } from '@paralax/contracts';
import { SchemaPipe } from '../../common/schema.pipe';
import { Identity, type AuthIdentity } from '../auth/auth.decorators';
import { SocialService } from './social.service';

@Controller('social')
export class SocialController {
  constructor(private readonly social: SocialService) {}
  @Get('search')
  search(@Identity() identity: AuthIdentity, @Query(new SchemaPipe(socialSearchSchema)) query: SocialSearchQuery, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store'); return this.social.search(identity.userId, query.search);
  }
  @Get('connections')
  list(@Identity() identity: AuthIdentity, @Query(new SchemaPipe(socialListSchema)) query: SocialListQuery, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store'); return this.social.list(identity.userId, query.page);
  }
  @Post('requests')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  request(@Identity() identity: AuthIdentity, @Body(new SchemaPipe(friendRequestSchema)) input: FriendRequestInput, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store'); return this.social.request(identity.userId, input.username);
  }
  @Post('connections/:id/action')
  @HttpCode(204)
  action(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(friendActionSchema)) input: FriendActionInput, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store'); return this.social.action(identity.userId, id, input.action);
  }
  @Get('connections/:id/messages')
  messages(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Query(new SchemaPipe(messageListSchema)) query: MessageListQuery, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store'); return this.social.messages(identity.userId, id, query.before);
  }
  @Post('connections/:id/messages')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  send(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(directMessageSchema)) input: DirectMessageInput, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store'); return this.social.send(identity.userId, id, input);
  }
  @Post('connections/:id/read')
  @HttpCode(204)
  read(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(messageReadSchema)) input: MessageReadInput, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store'); return this.social.read(identity.userId, id, input.sequence);
  }
}
