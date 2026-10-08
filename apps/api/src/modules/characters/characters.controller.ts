import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createCharacterSchema, updateCharacterSchema, listCharactersQuerySchema, type CreateCharacterInput, type UpdateCharacterInput, type ListSystemsQuery } from '@paralax/contracts';
import { SchemaPipe } from '../../common/schema.pipe';
import { Identity, type AuthIdentity } from '../auth/auth.decorators';
import { CharactersService } from './characters.service';

@Controller()
export class CharactersController {
  constructor(private readonly characters: CharactersService) {}
  @Get('characters/mine')
  mine(@Identity() identity: AuthIdentity, @Query(new SchemaPipe(listCharactersQuerySchema)) query: ListSystemsQuery, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.characters.list(identity.userId, query);
  }
  @Get('campaigns/:id/characters')
  list(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Query(new SchemaPipe(listCharactersQuerySchema)) query: ListSystemsQuery, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.characters.list(identity.userId, query, id);
  }
  @Post('campaigns/:id/characters')
  create(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(createCharacterSchema)) input: CreateCharacterInput, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.characters.create(identity.userId, id, input);
  }
  @Get('characters/:id')
  detail(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.characters.detail(identity.userId, id);
  }
  @Put('characters/:id')
  update(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(updateCharacterSchema)) input: UpdateCharacterInput, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store'); return this.characters.update(identity.userId, id, input);
  }
}
