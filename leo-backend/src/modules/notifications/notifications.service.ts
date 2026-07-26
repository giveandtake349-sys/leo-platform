import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { DeviceEntity } from '../auth/entities/otp-request.entity';
import { ConfigService } from '@nestjs/config';

export interface SendNotificationDto {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, string>;
  channel?: 'push' | 'in_app';
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  // firebase-admin loaded dynamically so missing package doesn't crash startup
  private firebaseMessaging: any = null;

  constructor(
    @InjectRepository(NotificationEntity)
    private notifRepo: Repository<NotificationEntity>,
    @InjectRepository(DeviceEntity)
    private deviceRepo: Repository<DeviceEntity>,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const admin = require('firebase-admin');
      const projectId = this.config.get('FIREBASE_PROJECT_ID');
      if (projectId) {
        const app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey: this.config
              .get<string>('FIREBASE_PRIVATE_KEY')
              ?.replace(/\\n/g, '\n'),
            clientEmail: this.config.get('FIREBASE_CLIENT_EMAIL'),
          }),
        });
        this.firebaseMessaging = admin.messaging(app);
        this.logger.log('Firebase initialized');
      }
    } catch {
      this.logger.warn('Firebase not configured — push notifications disabled');
    }
  }

  async send(dto: SendNotificationDto): Promise<void> {
    const notif = await this.notifRepo.save(
      this.notifRepo.create({
        userId: dto.userId,
        type: dto.type,
        channel: dto.channel ?? 'in_app',
        title: dto.title,
        body: dto.body ?? null,
        data: (dto.data as any) ?? null,
      }),
    );

    if (this.firebaseMessaging) {
      await this.sendFcmPush(dto);
    }

    await this.notifRepo.update(notif.id, { sentAt: new Date() });
  }

  private async sendFcmPush(dto: SendNotificationDto): Promise<void> {
    try {
      const devices = await this.deviceRepo.find({ where: { userId: dto.userId } });
      const tokens = devices.map((d) => d.deviceToken).filter(Boolean);
      if (!tokens.length) return;

      await this.firebaseMessaging.sendEachForMulticast({
        tokens,
        notification: { title: dto.title, body: dto.body ?? '' },
        data: dto.data,
        android: { priority: 'high' },
      });
    } catch (err) {
      this.logger.error('FCM push failed', err);
    }
  }

  async getMyNotifications(userId: string, query: { page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, query.limit || 20);
    const [data, total] = await this.notifRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { page, limit, total } };
  }

  async markRead(userId: string, notifId: string): Promise<void> {
    await this.notifRepo.update({ id: notifId, userId }, { isRead: true });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifRepo.update({ userId, isRead: false }, { isRead: true });
  }
}
