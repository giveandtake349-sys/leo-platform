import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobsService } from '../modules/jobs/jobs.service';

@Injectable()
export class PremiumBoostJob {
  private readonly logger = new Logger(PremiumBoostJob.name);

  constructor(private readonly jobsService: JobsService) {}

  /** Runs every minute — un-boosts any job whose 4-hour boost window has expired */
  @Cron(CronExpression.EVERY_MINUTE)
  async expirePremiumBoosts(): Promise<void> {
    try {
      await this.jobsService.expireBoosts();
    } catch (err) {
      this.logger.error('Premium boost expiry job failed', err);
    }
  }
}
