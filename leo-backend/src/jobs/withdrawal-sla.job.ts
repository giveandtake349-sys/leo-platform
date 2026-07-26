import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { WithdrawalEntity } from '../modules/wallet/entities/wallet.entity';

@Injectable()
export class WithdrawalSlaJob {
  private readonly logger = new Logger(WithdrawalSlaJob.name);

  constructor(
    @InjectRepository(WithdrawalEntity)
    private readonly withdrawalRepo: Repository<WithdrawalEntity>,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkWithdrawalSla(): Promise<void> {
    try {
      const twentyHoursAgo = new Date(Date.now() - 20 * 3600 * 1000);
      const stale = await this.withdrawalRepo.find({
        where: { status: 'pending', requestedAt: LessThan(twentyHoursAgo) },
      });
      if (stale.length > 0) {
        this.logger.warn(
          `SLA WARNING: ${stale.length} withdrawal(s) pending >20h — IDs: ${stale.map((w) => w.id).join(', ')}`,
        );
      }
    } catch (err) {
      this.logger.error('Withdrawal SLA check failed', err);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async failOverdueWithdrawals(): Promise<void> {
    try {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 3600 * 1000);
      const overdue = await this.withdrawalRepo.find({
        where: { status: 'pending', requestedAt: LessThan(fortyEightHoursAgo) },
      });
      for (const w of overdue) {
        await this.withdrawalRepo.update(w.id, {
          status: 'failed',
          failureReason: 'Auto-failed after 48h SLA breach',
          processedAt: new Date(),
        });
        this.logger.error(`Withdrawal ${w.id} auto-failed after 48h`);
      }
    } catch (err) {
      this.logger.error('Overdue withdrawal cleanup failed', err);
    }
  }
}
