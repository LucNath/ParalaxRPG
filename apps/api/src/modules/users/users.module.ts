import { Module } from '@nestjs/common';
import { AvatarsController, UsersController } from './users.controller';
import { AvatarService } from './avatar.service';

@Module({ controllers: [UsersController, AvatarsController], providers: [AvatarService] })
export class UsersModule {}
