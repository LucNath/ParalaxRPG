import { Module } from '@nestjs/common';
import { RollsController } from './rolls.controller';
import { RollsService } from './rolls.service';

@Module({ controllers: [RollsController], providers: [RollsService] })
export class RollsModule {}
