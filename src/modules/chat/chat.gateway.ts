import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService, SendMessageDto } from './chat.service';
import { Logger } from '@nestjs/common';

interface AuthSocket extends Socket {
  userId: string;
  role: string;
}

@WebSocketGateway({ namespace: '/ws/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);
  private readonly onlineUsers = new Map<string, Set<string>>();

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(socket: AuthSocket) {
    try {
      const token =
        (socket.handshake.query.token as string) ||
        (socket.handshake.headers.authorization as string)?.slice(7);

      if (!token) { socket.disconnect(); return; }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });
      socket.userId = payload.sub;
      socket.role = payload.role;

      if (!this.onlineUsers.has(socket.userId)) {
        this.onlineUsers.set(socket.userId, new Set());
      }
      this.onlineUsers.get(socket.userId)!.add(socket.id);
      await socket.join(`user:${socket.userId}`);
      this.server.emit('presence:update', { userId: socket.userId, isOnline: true });
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: AuthSocket) {
    if (!socket.userId) return;
    const sockets = this.onlineUsers.get(socket.userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        this.onlineUsers.delete(socket.userId);
        this.server.emit('presence:update', {
          userId: socket.userId,
          isOnline: false,
          lastSeenAt: new Date(),
        });
      }
    }
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { chatId: string } & SendMessageDto,
  ) {
    try {
      const msg = await this.chatService.sendMessage(socket.userId, data.chatId, {
        type: data.type,
        content: data.content,
        latitude: data.latitude,
        longitude: data.longitude,
      });
      this.server.to(`chat:${data.chatId}`).emit('message:new', msg);
    } catch (err: any) {
      socket.emit('error', {
        code: err?.response?.error?.code || 'SEND_ERROR',
        message: err?.message,
      });
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { chatId: string },
  ) {
    await socket.join(`chat:${data.chatId}`);
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { chatId: string },
  ) {
    socket.to(`chat:${data.chatId}`).emit('typing:update', {
      chatId: data.chatId,
      userId: socket.userId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { chatId: string },
  ) {
    socket.to(`chat:${data.chatId}`).emit('typing:update', {
      chatId: data.chatId,
      userId: socket.userId,
      isTyping: false,
    });
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() data: { chatId: string; messageId: string },
  ) {
    await this.chatService.markRead(socket.userId, data.chatId, data.messageId);
    socket.to(`chat:${data.chatId}`).emit('message:read:ack', {
      chatId: data.chatId,
      messageId: data.messageId,
      readBy: socket.userId,
      readAt: new Date(),
    });
  }

  notifyContactUnlocked(chatId: string) {
    this.server.to(`chat:${chatId}`).emit('contact:unlocked', { chatId });
  }
}
