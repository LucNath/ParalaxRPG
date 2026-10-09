import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { sessionMessageSchema, messageListSchema, messageReadSchema, type SessionMessageInput, type MessageListQuery, type MessageReadInput } from '@paralax/contracts';
import { SchemaPipe } from '../../common/schema.pipe';
import { Identity, type AuthIdentity } from '../auth/auth.decorators';
import { SessionChatService } from './session-chat.service';

@Controller('sessions/:id/messages')
export class SessionChatController {
  constructor(private readonly chat: SessionChatService) {}
  @Get()
  list(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Query(new SchemaPipe(messageListSchema)) query: MessageListQuery, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store'); return this.chat.list(identity.userId, id, query.before);
  }
  @Post() @Throttle({ default: { limit: 30, ttl: 60000 } })
  send(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(sessionMessageSchema)) input: SessionMessageInput, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store'); return this.chat.send(identity.userId, id, input);
  }
  @Post('read') @HttpCode(204)
  read(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(messageReadSchema)) input: MessageReadInput, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store'); return this.chat.read(identity.userId, id, input.sequence);
  }
}
