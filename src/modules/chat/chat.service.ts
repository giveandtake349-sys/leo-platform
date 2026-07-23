import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatEntity } from './entities/chat.entity';
import { MessageEntity, MessageAttachmentEntity } from './entities/chat.entity';
import { ChatModerationService } from './chat-moderation.service';
import { paginate, paginationParams } from '../../common/utils/pagination.util';

export interface SendMessageDto {
  type: 'text' | 'voice' | 'image' | 'pdf' | 'location' | 'quick_reply';
  content?: string;
  latitude?: number;
  longitude?: number;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatEntity) private chatRepo: Repository<ChatEntity>,
    @InjectRepository(MessageEntity) private msgRepo: Repository<MessageEntity>,
    @InjectRepository(MessageAttachmentEntity)
    private attachRepo: Repository<MessageAttachmentEntity>,
    private readonly moderation: ChatModerationService,
  ) {}

  async getOrCreateChat(
    requestingUserId: string,
    counterpartyUserId: string,
    jobId: string | null,
    requestingRole: 'employer' | 'worker',
  ): Promise<ChatEntity> {
    const [empId, wrkId] =
      requestingRole === 'employer'
        ? [requestingUserId, counterpartyUserId]
        : [counterpartyUserId, requestingUserId];

    let chat = await this.chatRepo.findOne({
      where: { employerUserId: empId, workerUserId: wrkId },
    });
    if (!chat) {
      chat = await this.chatRepo.save(
        this.chatRepo.create({ employerUserId: empId, workerUserId: wrkId, jobId }),
      );
    }
    return chat;
  }

  async getMyChats(userId: string) {
    return this.chatRepo
      .createQueryBuilder('c')
      .where('c.employer_user_id = :uid OR c.worker_user_id = :uid', { uid: userId })
      .orderBy('c.updated_at', 'DESC')
      .getMany();
  }

  async getMessages(
    userId: string,
    chatId: string,
    query: { page?: number; limit?: number },
  ) {
    const chat = await this.findChatAndAssertParticipant(chatId, userId);
    const { skip, take, page, limit } = paginationParams(query);
    const [data, total] = await this.msgRepo.findAndCount({
      where: { chatId: chat.id },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return paginate(data, total, page, limit);
  }

  async sendMessage(
    userId: string,
    chatId: string,
    dto: SendMessageDto,
  ): Promise<MessageEntity> {
    const chat = await this.findChatAndAssertParticipant(chatId, userId);
    const isLocked = chat.status === 'locked';
    let content = dto.content ?? null;

    if (dto.type === 'text' && content) {
      const result = this.moderation.moderate(content, isLocked);
      if (!result.isClean) {
        throw new BadRequestException({
          code: 'CHAT_CONTACT_INFO_BLOCKED',
          message: result.flaggedReason,
        });
      }
    }

    const msg = await this.msgRepo.save(
      this.msgRepo.create({
        chatId,
        senderId: userId,
        messageType: dto.type,
        content,
        isFlagged: false,
        flaggedReason: null,
      }),
    );

    await this.chatRepo.update(chatId, { updatedAt: new Date() });

    if (dto.type === 'location' && dto.latitude != null && dto.longitude != null) {
      await this.attachRepo.save(
        this.attachRepo.create({
          messageId: msg.id,
          fileUrl: '',
          fileType: 'location',
          latitude: dto.latitude,
          longitude: dto.longitude,
        }),
      );
    }

    return msg;
  }

  async markRead(userId: string, chatId: string, messageId: string): Promise<void> {
    await this.findChatAndAssertParticipant(chatId, userId);
    await this.msgRepo.update({ id: messageId, chatId }, { isRead: true });
  }

  async unlockContacts(chatId: string): Promise<void> {
    await this.chatRepo.update(chatId, {
      contactUnlocked: true,
      contactUnlockedAt: new Date(),
      status: 'active',
    });
  }

  private async findChatAndAssertParticipant(
    chatId: string,
    userId: string,
  ): Promise<ChatEntity> {
    const chat = await this.chatRepo.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('Chat not found');
    if (chat.employerUserId !== userId && chat.workerUserId !== userId) {
      throw new ForbiddenException('Not a participant in this chat');
    }
    return chat;
  }
}
