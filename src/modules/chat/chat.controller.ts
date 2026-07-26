import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ChatService, SendMessageDto } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { IsEnum, IsOptional, IsString, IsNumber, IsUUID } from 'class-validator';

class CreateChatDto {
  @IsUUID()
  counterpartyUserId: string;

  @IsOptional()
  @IsUUID()
  jobId?: string;
}

class SendMsgDto implements SendMessageDto {
  @IsEnum(['text', 'voice', 'image', 'pdf', 'location', 'quick_reply'])
  type: 'text' | 'voice' | 'image' | 'pdf' | 'location' | 'quick_reply';

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly svc: ChatService) {}

  @Get()
  myChats(@CurrentUser() u: JwtPayload) {
    return this.svc.getMyChats(u.sub);
  }

  @Post()
  getOrCreate(@CurrentUser() u: JwtPayload, @Body() dto: CreateChatDto) {
    return this.svc.getOrCreateChat(
      u.sub,
      dto.counterpartyUserId,
      dto.jobId ?? null,
      u.role,
    );
  }

  @Get(':id/messages')
  getMessages(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Query() query: { page?: number; limit?: number },
  ) {
    return this.svc.getMessages(u.sub, id, query);
  }

  @Post(':id/messages')
  sendMessage(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SendMsgDto,
  ) {
    return this.svc.sendMessage(u.sub, id, dto);
  }

  @Patch(':id/messages/:msgId/read')
  markRead(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Param('msgId') msgId: string,
  ) {
    return this.svc.markRead(u.sub, id, msgId);
  }
}
