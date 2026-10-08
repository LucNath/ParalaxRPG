import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createSessionSchema, updateSessionSchema, sessionActionSchema, listSessionsQuerySchema, listSystemsQuerySchema, type SessionSettings, type UpdateSessionInput, type SessionActionInput, type ListSessionsQuery, type ListSystemsQuery } from '@paralax/contracts';
import { SchemaPipe } from '../../common/schema.pipe';
import { Identity, Public, type AuthIdentity } from '../auth/auth.decorators';
import { SessionsService } from './sessions.service';

@Controller()
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}
  @Get('sessions/mine')
  mine(@Identity() identity: AuthIdentity, @Query(new SchemaPipe(listSessionsQuerySchema)) query: ListSessionsQuery, @Res({ passthrough: true }) response: Response) { response.setHeader('Cache-Control', 'no-store'); return this.sessions.list(identity.userId, query); }
  @Public() @Get('sessions/public')
  publicList(@Query(new SchemaPipe(listSystemsQuerySchema)) query: ListSystemsQuery, @Res({ passthrough: true }) response: Response) { response.setHeader('Cache-Control', 'no-store'); return this.sessions.publicList(query); }
  @Public() @Get('sessions/public/:id')
  publicRead(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Res({ passthrough: true }) response: Response) { response.setHeader('Cache-Control', 'no-store'); return this.sessions.publicRead(id); }
  @Get('campaigns/:id/sessions')
  list(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Query(new SchemaPipe(listSessionsQuerySchema)) query: ListSessionsQuery, @Res({ passthrough: true }) response: Response) { response.setHeader('Cache-Control', 'no-store'); return this.sessions.list(identity.userId, query, id); }
  @Post('campaigns/:id/sessions')
  create(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(createSessionSchema)) input: SessionSettings, @Res({ passthrough: true }) response: Response) { response.setHeader('Cache-Control', 'no-store'); return this.sessions.create(identity.userId, id, input); }
  @Get('sessions/:id')
  read(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Res({ passthrough: true }) response: Response) { response.setHeader('Cache-Control', 'no-store'); return this.sessions.read(identity.userId, id); }
  @Put('sessions/:id')
  update(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(updateSessionSchema)) input: UpdateSessionInput, @Res({ passthrough: true }) response: Response) { response.setHeader('Cache-Control', 'no-store'); return this.sessions.update(identity.userId, id, input); }
  @Post('sessions/:id/start') @HttpCode(200)
  start(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(sessionActionSchema)) input: SessionActionInput, @Res({ passthrough: true }) response: Response) { response.setHeader('Cache-Control', 'no-store'); return this.sessions.action(identity.userId, id, input, 'start'); }
  @Post('sessions/:id/end') @HttpCode(200)
  end(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(sessionActionSchema)) input: SessionActionInput, @Res({ passthrough: true }) response: Response) { response.setHeader('Cache-Control', 'no-store'); return this.sessions.action(identity.userId, id, input, 'end'); }
  @Post('sessions/:id/cancel') @HttpCode(200)
  cancel(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(sessionActionSchema)) input: SessionActionInput, @Res({ passthrough: true }) response: Response) { response.setHeader('Cache-Control', 'no-store'); return this.sessions.action(identity.userId, id, input, 'cancel'); }
}
