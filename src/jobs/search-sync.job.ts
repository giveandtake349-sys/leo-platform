import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { SearchSyncQueueEntity } from '../modules/search/entities/search-sync-queue.entity';
import { SearchService } from '../modules/search/search.service';
import { JobEntity } from '../modules/jobs/entities/job.entity';
import { WorkerProfileEntity } from '../modules/workers/entities/worker-profile.entity';

@Injectable()
export class SearchSyncJob {
  private readonly logger = new Logger(SearchSyncJob.name);

  constructor(
    @InjectRepository(SearchSyncQueueEntity)
    private readonly queueRepo: Repository<SearchSyncQueueEntity>,
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
    @InjectRepository(WorkerProfileEntity)
    private readonly workerRepo: Repository<WorkerProfileEntity>,
    private readonly searchService: SearchService,
  ) {}

  @Cron('*/10 * * * * *')
  async syncToElasticsearch(): Promise<void> {
    try {
      const items = await this.queueRepo.find({
        where: { processedAt: IsNull() },
        order: { createdAt: 'ASC' },
        take: 50,
      });

      for (const item of items) {
        try {
          if (item.operation === 'index') {
            await this.indexEntity(item.entityType, item.entityId);
          } else if (item.operation === 'delete') {
            const index = item.entityType === 'job' ? 'leo_jobs' : 'leo_workers';
            await this.searchService.deleteDocument(index, item.entityId);
          }
          await this.queueRepo.update(item.id, { processedAt: new Date() });
        } catch (err) {
          this.logger.error(`Failed to process search sync item ${item.id}`, err);
        }
      }
    } catch (err) {
      this.logger.error('Search sync job failed', err);
    }
  }

  private async indexEntity(entityType: string, entityId: string): Promise<void> {
    if (entityType === 'job') {
      const job = await this.jobRepo.findOne({
        where: { id: entityId },
        relations: ['company', 'category'],
      });
      if (job) {
        await this.searchService.indexJob({
          id: job.id,
          title: job.title,
          description: job.description,
          jobType: job.jobType,
          workMode: job.workMode,
          status: job.status,
          categoryId: job.categoryId,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          district: job.district,
          division: job.division,
          isPremium: job.isPremium,
          companyName: (job as any).company?.companyName,
          createdAt: job.createdAt,
        });
      }
    } else if (entityType === 'worker_profile') {
      const worker = await this.workerRepo.findOne({ where: { id: entityId } });
      if (worker) {
        await this.searchService.indexWorker({
          id: worker.id,
          fullName: worker.fullName,
          bio: worker.bio,
          availabilityMode: worker.availabilityMode,
          openToWork: worker.openToWork,
          trustBadge: worker.trustBadge,
          profileStrength: worker.profileStrength,
          experienceYears: worker.experienceYears,
          languages: worker.languages,
          district: worker.district,
          division: worker.division,
          createdAt: worker.createdAt,
        });
      }
    }
  }
}
