import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionEntity } from './entities/subscription.entity';
import { UserEntity } from '../auth/entities/user.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private subRepo: Repository<SubscriptionEntity>,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
  ) {}

  async subscribe(
    userId: string,
    plan: 'worker_premium' | 'employer_premium',
  ): Promise<SubscriptionEntity> {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const sub = await this.subRepo.save(
      this.subRepo.create({ userId, plan, expiresAt, status: 'active' }),
    );

    await this.userRepo.update(userId, { isPremium: true, premiumExpiresAt: expiresAt });
    return sub;
  }

  async getActive(userId: string): Promise<SubscriptionEntity | null> {
    return this.subRepo.findOne({
      where: { userId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  async cancel(userId: string, subId: string): Promise<void> {
    const sub = await this.subRepo.findOne({ where: { id: subId, userId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    await this.subRepo.update(subId, { autoRenew: false, status: 'cancelled' });
    await this.userRepo.update(userId, { isPremium: false });
  }
}
