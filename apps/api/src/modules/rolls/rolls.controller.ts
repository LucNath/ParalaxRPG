import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { createDiceRollSchema, listDiceRollsQuerySchema, type CreateDiceRollInput, type ListDiceRollsQuery } from '@paralax/contracts';
import { SchemaPipe } from '../../common/schema.pipe';
import { Identity, type AuthIdentity } from '../auth/auth.decorators';
import { RollsService } from './rolls.service';

@Controller('sessions/:id/rolls')
export class RollsController {
  constructor(private readonly rolls: RollsService) {}
  @Get('options')
  options(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.rolls.options(identity.userId, id);
  }
  @Get()
  list(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Query(new SchemaPipe(listDiceRollsQuerySchema)) query: ListDiceRollsQuery, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.rolls.list(identity.userId, id, query);
  }
  @Post() @Throttle({ default: { limit: 30, ttl: 60000 } })
  create(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(createDiceRollSchema)) input: CreateDiceRollInput, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.rolls.create(identity.userId, id, input);
  }
}
