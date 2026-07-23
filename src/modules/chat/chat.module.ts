import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ChatEntity,
  MessageEntity,
  MessageAttachmentEntity,
} from './entities/chat.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatModerationService } from './chat-moderation.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatEntity, MessageEntity, MessageAttachmentEntity]),
    AuthModule,
  ],
  providers: [ChatService, ChatGateway, ChatModerationService],
  controllers: [ChatController],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
