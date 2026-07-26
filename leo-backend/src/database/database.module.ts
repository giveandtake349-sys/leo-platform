import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

// Auth
import { UserEntity } from '../modules/auth/entities/user.entity';
import {
  OtpRequestEntity,
  SessionEntity,
  DeviceEntity,
} from '../modules/auth/entities/otp-request.entity';

// Companies / Workers / Categories
import { CompanyEntity } from '../modules/companies/entities/company.entity';
import {
  WorkerProfileEntity,
  WorkerSkillEntity,
  WorkerPortfolioEntity,
  WorkerCertificateEntity,
} from '../modules/workers/entities/worker-profile.entity';
import { CategoryEntity } from '../modules/categories/entities/category.entity';
import { SkillEntity } from '../modules/categories/entities/skill.entity';

// Jobs
import {
  JobEntity,
  ApplicationEntity,
  InterestEntity,
  SavedItemEntity,
  BlockedUserEntity,
} from '../modules/jobs/entities/job.entity';

// Chat
import {
  ChatEntity,
  MessageEntity,
  MessageAttachmentEntity,
} from '../modules/chat/entities/chat.entity';

// Contracts
import {
  ContractEntity,
  MilestoneEntity,
} from '../modules/contracts/entities/contract.entity';

// Escrow
import {
  EscrowEntity,
  EscrowTransitionEntity,
} from '../modules/escrow/entities/escrow.entity';

// Wallet
import {
  WalletEntity,
  WalletTransactionEntity,
  WithdrawalEntity,
} from '../modules/wallet/entities/wallet.entity';

// Payments
import { PaymentTransactionEntity } from '../modules/payments/entities/payment-transaction.entity';

// Notifications
import { NotificationEntity } from '../modules/notifications/entities/notification.entity';

// Reviews
import {
  ReviewEntity,
  ReportEntity,
  DisputeEntity,
} from '../modules/reviews/entities/dispute.entity';

// Subscriptions
import { SubscriptionEntity } from '../modules/subscriptions/entities/subscription.entity';

// KYC
import { KycVerificationEntity } from '../modules/kyc/entities/kyc-verification.entity';

// Admin
import {
  AdminUserEntity,
  RoleEntity,
  AuditLogEntity,
  FeatureFlagEntity,
} from '../modules/admin/entities/admin-user.entity';

// Search
import { SearchSyncQueueEntity } from '../modules/search/entities/search-sync-queue.entity';

const ALL_ENTITIES = [
  UserEntity, OtpRequestEntity, SessionEntity, DeviceEntity,
  CompanyEntity,
  WorkerProfileEntity, WorkerSkillEntity, WorkerPortfolioEntity, WorkerCertificateEntity,
  CategoryEntity, SkillEntity,
  JobEntity, ApplicationEntity, InterestEntity, SavedItemEntity, BlockedUserEntity,
  ChatEntity, MessageEntity, MessageAttachmentEntity,
  ContractEntity, MilestoneEntity,
  EscrowEntity, EscrowTransitionEntity,
  WalletEntity, WalletTransactionEntity, WithdrawalEntity,
  PaymentTransactionEntity,
  NotificationEntity,
  ReviewEntity, ReportEntity, DisputeEntity,
  SubscriptionEntity,
  KycVerificationEntity,
  AdminUserEntity, RoleEntity, AuditLogEntity, FeatureFlagEntity,
  SearchSyncQueueEntity,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get<string>('DATABASE_URL'),
ssl: {
  rejectUnauthorized: false,
},
        entities: ALL_ENTITIES,
        synchronize: cfg.get('NODE_ENV') !== 'production',
        logging: cfg.get('NODE_ENV') === 'development',
        extra: { max: 20 },
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
