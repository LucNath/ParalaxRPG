import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionChatService } from './session-chat.service';
import { SessionChatController } from './session-chat.controller';

@Module({ controllers: [SessionsController, SessionChatController], providers: [SessionsService, SessionChatService] })
export class SessionsModule {}
