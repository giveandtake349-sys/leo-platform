import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionEntity } from './entities/subscription.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { UserEntity } from '../auth/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionEntity, UserEntity]), AuthModule],
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService, TypeOrmModule],
})
export class SubscriptionsModule {}
