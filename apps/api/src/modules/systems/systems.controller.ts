import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createSystemSchema, updateSystemSchema, listSystemsQuerySchema, type CreateSystemInput, type UpdateSystemInput, type ListSystemsQuery } from '@paralax/contracts';
import { SchemaPipe } from '../../common/schema.pipe';
import { Identity, Public, type AuthIdentity } from '../auth/auth.decorators';
import { SystemsService } from './systems.service';

@Controller('systems')
export class SystemsController {
  constructor(private readonly systems: SystemsService) {}
  @Get('mine')
  mine(@Identity() identity: AuthIdentity, @Query(new SchemaPipe(listSystemsQuerySchema)) query: ListSystemsQuery, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return this.systems.list(query, identity.userId);
  }
  @Get('mine/:id')
  owned(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return this.systems.detail(id, identity.userId);
  }
  @Public()
  @Get('public')
  catalog(@Query(new SchemaPipe(listSystemsQuerySchema)) query: ListSystemsQuery, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return this.systems.list(query);
  }
  @Post()
  create(@Identity() identity: AuthIdentity, @Body(new SchemaPipe(createSystemSchema)) input: CreateSystemInput, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return this.systems.create(identity.userId, input);
  }
  @Put(':id')
  update(@Identity() identity: AuthIdentity, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body(new SchemaPipe(updateSystemSchema)) input: UpdateSystemInput, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return this.systems.update(identity.userId, id, input);
  }
  @Public()
  @Get(':id')
  detail(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return this.systems.detail(id);
  }
}
