import {
  Injectable, ConflictException, UnauthorizedException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PaymentTransactionEntity } from './entities/payment-transaction.entity';
import { EscrowService } from '../escrow/escrow.service';
import { SubscriptionEntity } from '../subscriptions/entities/subscription.entity';
import { JobEntity } from '../jobs/entities/job.entity';
import { BkashGateway } from './gateways/bkash.gateway';
import { IsEnum, IsNumber, IsString, IsOptional, IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @IsEnum([
    'job_boost_fee', 'permanent_job_fee', 'short_contract_commission',
    'escrow_funding', 'subscription',
  ])
  payableType: string;

  @IsOptional() @IsUUID() payableId?: string;

  @IsEnum(['bkash', 'nagad', 'rocket', 'sslcommerz', 'manual_bank'])
  gateway: string;

  @IsNumber() amount: number;
  @IsString() idempotencyKey: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentTransactionEntity)
    private txRepo: Repository<PaymentTransactionEntity>,
    @InjectRepository(JobEntity) private jobRepo: Repository<JobEntity>,
    @InjectRepository(SubscriptionEntity) private subRepo: Repository<SubscriptionEntity>,
    private readonly escrowService: EscrowService,
    private readonly bkash: BkashGateway,
    private readonly dataSource: DataSource,
  ) {}

  async initiate(
    userId: string,
    dto: InitiatePaymentDto,
  ): Promise<{ paymentId: string; status: string; gatewayRedirectUrl?: string }> {
    const existing = await this.txRepo.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      if (existing.status === 'success') {
        throw new ConflictException({
          code: 'PAYMENT_ALREADY_PROCESSED',
          message: 'Payment already processed',
        });
      }
      return { paymentId: existing.id, status: existing.status };
    }

    const tx = await this.txRepo.save(
      this.txRepo.create({
        userId,
        payableType: dto.payableType,
        payableId: dto.payableId ?? null,
        gateway: dto.gateway,
        amount: dto.amount,
        status: 'initiated',
        idempotencyKey: dto.idempotencyKey,
      }),
    );

    let gatewayRedirectUrl: string | undefined;

    if (dto.gateway === 'bkash') {
      try {
        const bkashRes = await this.bkash.createPayment({
          amount: dto.amount,
          invoiceNumber: tx.id,
          callbackUrl: `${process.env.FRONTEND_URL}/payments/bkash/callback`,
        });
        await this.txRepo.update(tx.id, {
          gatewayReference: bkashRes.paymentID,
          status: 'pending',
        });
        gatewayRedirectUrl = bkashRes.bkashURL;
      } catch (err) {
        await this.txRepo.update(tx.id, { status: 'failed' });
        throw err;
      }
    }

    return { paymentId: tx.id, status: 'pending', gatewayRedirectUrl };
  }

  async handleWebhook(
    gateway: string,
    rawBody: string,
    signature: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (gateway === 'bkash') {
      const valid = this.bkash.verifyWebhookSignature(signature, rawBody);
      if (!valid) {
        throw new UnauthorizedException({
          code: 'WEBHOOK_SIGNATURE_INVALID',
          message: 'Invalid webhook signature',
        });
      }
    }

    const gatewayRef = (
      payload['paymentID'] || payload['payment_id'] || payload['orderId']
    ) as string;
    const succeeded = this.isSuccessPayload(gateway, payload);

    const tx = await this.txRepo.findOne({ where: { gatewayReference: gatewayRef } });
    if (!tx) {
      this.logger.warn(`Webhook received for unknown reference: ${gatewayRef}`);
      return;
    }

    if (tx.status === 'success' || tx.status === 'refunded') {
      this.logger.log(`Duplicate webhook for ${gatewayRef} — already ${tx.status}`);
      return;
    }

    await this.dataSource.transaction(async (em) => {
      const newStatus = succeeded ? 'success' : 'failed';
      await em.update(PaymentTransactionEntity, tx.id, {
        status: newStatus,
        webhookPayload: payload,
      });
      if (!succeeded) return;
      await this.applyDomainEffect(tx);
    });
  }

  private async applyDomainEffect(tx: PaymentTransactionEntity): Promise<void> {
    switch (tx.payableType) {
      case 'escrow_funding':
        if (tx.payableId) await this.escrowService.markFunded(tx.payableId, tx.userId);
        break;
      case 'job_boost_fee':
        if (tx.payableId) {
          await this.jobRepo.update(tx.payableId, {
            isPremium: true,
            premiumBoostedAt: new Date(),
          });
        }
        break;
      case 'subscription':
        if (tx.payableId) {
          await this.subRepo.update(tx.payableId, { status: 'active' });
        }
        break;
      default:
        this.logger.log(`No domain effect for payable type: ${tx.payableType}`);
    }
  }

  private isSuccessPayload(gateway: string, payload: Record<string, unknown>): boolean {
    if (gateway === 'bkash') return payload['transactionStatus'] === 'Completed';
    if (gateway === 'nagad') return payload['status'] === 'Success';
    if (gateway === 'sslcommerz') return payload['status'] === 'VALID';
    return false;
  }
}
