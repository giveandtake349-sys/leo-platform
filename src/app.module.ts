import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WithdrawalEntity } from './modules/wallet/entities/wallet.entity';
import { SearchSyncQueueEntity } from './modules/search/entities/search-sync-queue.entity';
import { JobEntity } from './modules/jobs/entities/job.entity';
import { WorkerProfileEntity } from './modules/workers/entities/worker-profile.entity';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { WorkersModule } from './modules/workers/workers.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ChatModule } from './modules/chat/chat.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { EscrowModule } from './modules/escrow/escrow.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { KycModule } from './modules/kyc/kyc.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { SearchModule } from './modules/search/search.module';
import { AdminModule } from './modules/admin/admin.module';
import { DatabaseModule } from './database/database.module';
import { PremiumBoostJob } from './jobs/premium-boost.job';
import { WithdrawalSlaJob } from './jobs/withdrawal-sla.job';
import { SearchSyncJob } from './jobs/search-sync.job';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DatabaseModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => [
        {
          ttl: cfg.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: cfg.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    ScheduleModule.forRoot(),
    // Extra entities needed by background jobs
    TypeOrmModule.forFeature([
      WithdrawalEntity,
      SearchSyncQueueEntity,
      JobEntity,
      WorkerProfileEntity,
    ]),
    AuthModule,
    UsersModule,
    CompaniesModule,
    WorkersModule,
    CategoriesModule,
    JobsModule,
    ChatModule,
    ContractsModule,
    EscrowModule,
    WalletModule,
    PaymentsModule,
    NotificationsModule,
    KycModule,
    ReviewsModule,
    SubscriptionsModule,
    SearchModule,
    AdminModule,
  ],
  providers: [PremiumBoostJob, WithdrawalSlaJob, SearchSyncJob],
})
export class AppModule {}
