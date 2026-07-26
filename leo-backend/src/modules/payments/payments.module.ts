import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTransactionEntity } from './entities/payment-transaction.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { BkashGateway } from './gateways/bkash.gateway';
import { JobEntity } from '../jobs/entities/job.entity';
import { SubscriptionEntity } from '../subscriptions/entities/subscription.entity';
import { AuthModule } from '../auth/auth.module';
import { EscrowModule } from '../escrow/escrow.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTransactionEntity, JobEntity, SubscriptionEntity]),
    AuthModule,
    EscrowModule,
  ],
  providers: [PaymentsService, BkashGateway],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
