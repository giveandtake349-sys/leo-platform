import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  JobEntity, ApplicationEntity, InterestEntity,
  SavedItemEntity, BlockedUserEntity,
} from './entities/job.entity';
import { CompanyEntity } from '../companies/entities/company.entity';
import { WalletEntity } from '../wallet/entities/wallet.entity';
import { ConfigService } from '@nestjs/config';
import { paginate, paginationParams } from '../../common/utils/pagination.util';
import {
  IsString, IsEnum, IsOptional, IsNumber, MaxLength, Min, Max, IsArray,
} from 'class-validator';

export class CreateJobDto {
  @IsString() categoryId: string;
  @IsString() @MaxLength(120) title: string;
  @IsString() @MaxLength(5000) description: string;
  @IsEnum(['offline_short_contract', 'permanent', 'online_freelance']) jobType: string;
  @IsEnum(['offline', 'online', 'both']) workMode: string;
  @IsOptional() @IsNumber() @Min(0) salaryMin?: number;
  @IsOptional() @IsNumber() @Min(0) salaryMax?: number;
  @IsOptional() @IsString() salaryPeriod?: string;
  @IsOptional() @IsString() division?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() thana?: string;
  @IsOptional() @IsString() village?: string;
  @IsOptional() @IsNumber() locationLat?: number;
  @IsOptional() @IsNumber() locationLng?: number;
  @IsOptional() @IsArray() skillIds?: string[];
}

export class FilterJobsDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() division?: string;
  @IsOptional() @IsNumber() minSalary?: number;
  @IsOptional() @IsNumber() maxSalary?: number;
  @IsOptional() @IsString() workMode?: string;
  @IsOptional() @IsString() jobType?: string;
  @IsOptional() @IsNumber() locationLat?: number;
  @IsOptional() @IsNumber() locationLng?: number;
  @IsOptional() @IsNumber() radiusKm?: number;
  @IsOptional() @IsString() sort?: string;
  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(100) limit?: number;
}

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobEntity) private jobRepo: Repository<JobEntity>,
    @InjectRepository(ApplicationEntity) private appRepo: Repository<ApplicationEntity>,
    @InjectRepository(InterestEntity) private interestRepo: Repository<InterestEntity>,
    @InjectRepository(SavedItemEntity) private savedRepo: Repository<SavedItemEntity>,
    @InjectRepository(BlockedUserEntity) private blockedRepo: Repository<BlockedUserEntity>,
    @InjectRepository(CompanyEntity) private companyRepo: Repository<CompanyEntity>,
    @InjectRepository(WalletEntity) private walletRepo: Repository<WalletEntity>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateJobDto): Promise<JobEntity> {
    const company = await this.companyRepo.findOne({ where: { userId } });
    if (!company) throw new ForbiddenException('Create a company profile first');
    if (dto.salaryMin && dto.salaryMax && dto.salaryMin > dto.salaryMax) {
      throw new BadRequestException({
        code: 'JOB_INVALID_SALARY_RANGE',
        message: 'salaryMin must be ≤ salaryMax',
      });
    }
    const job = this.jobRepo.create({ ...dto, companyId: company.id });
    return this.jobRepo.save(job);
  }

  async findFeed(dto: FilterJobsDto) {
    const { skip, take, page, limit } = paginationParams(dto);
    const qb = this.jobRepo
      .createQueryBuilder('j')
     // .leftJoinAndSelect('j.company', 'c')
     // .leftJoinAndSelect('j.category', 'cat')
      .where('j.deleted_at IS NULL')
      .andWhere('j.status = :s', { s: 'active' });

    if (dto.categoryId) qb.andWhere('j.category_id = :cid', { cid: dto.categoryId });
    if (dto.district) qb.andWhere('j.district = :d', { d: dto.district });
    if (dto.workMode) qb.andWhere('j.work_mode = :wm', { wm: dto.workMode });
    if (dto.jobType) qb.andWhere('j.job_type = :jt', { jt: dto.jobType });
    if (dto.minSalary) qb.andWhere('j.salary_max >= :mn', { mn: dto.minSalary });
    if (dto.maxSalary) qb.andWhere('j.salary_min <= :mx', { mx: dto.maxSalary });

    qb.orderBy('j.is_premium', 'DESC')
  .addOrderBy('j.created_at', 'DESC');

    qb.skip(skip).take(take);

const data = await qb.getMany();
const total = await qb.getCount();

return paginate(data, total, page, limit);
    return paginate(data, total, page, limit);
  }

  async findById(id: string): Promise<JobEntity> {
    const j = await this.jobRepo.findOne({
      where: { id },
      relations: ['company', 'category'],
    });
    if (!j) throw new NotFoundException('Job not found');
    await this.jobRepo.increment({ id }, 'viewCount', 1);
    return j;
  }

  async applyToJob(
    userId: string,
    jobId: string,
    coverNote?: string,
  ): Promise<ApplicationEntity> {
    const job = await this.findById(jobId);
    const existing = await this.appRepo.findOne({
      where: { jobId, workerId: userId },
    });
    if (existing) throw new ConflictException('Already applied to this job');
    const app = this.appRepo.create({
      jobId: job.id,
      workerId: userId,
      coverNote: coverNote ?? null,
    });
    await this.jobRepo.increment({ id: jobId }, 'applicantCount', 1);
    return this.appRepo.save(app);
  }

  async updateApplicationStatus(
    companyUserId: string,
    appId: string,
    status: string,
  ): Promise<ApplicationEntity> {
    const app = await this.appRepo.findOne({
      where: { id: appId },
      relations: ['job', 'job.company'],
    } as any);
    if (!app) throw new NotFoundException('Application not found');
    const company = await this.companyRepo.findOne({ where: { userId: companyUserId } });
    if (!company || (app as any).job.companyId !== company.id) throw new ForbiddenException();
    await this.appRepo.update(appId, { status });
    return { ...app, status } as ApplicationEntity;
  }

  async boostJob(
    userId: string,
    jobId: string,
  ): Promise<{ jobId: string; boostedAt: Date; expiresAt: Date }> {
    const company = await this.companyRepo.findOne({ where: { userId } });
    if (!company) throw new ForbiddenException();
    const job = await this.jobRepo.findOne({ where: { id: jobId, companyId: company.id } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.isPremium && job.premiumBoostedAt) {
      const expiresAt = new Date(job.premiumBoostedAt.getTime() + 4 * 3600 * 1000);
      if (expiresAt > new Date()) {
        throw new ConflictException({
          code: 'JOB_ALREADY_BOOSTED',
          message: 'Job is already boosted',
        });
      }
    }
    const boostedAt = new Date();
    await this.jobRepo.update(jobId, { isPremium: true, premiumBoostedAt: boostedAt });
    return {
      jobId,
      boostedAt,
      expiresAt: new Date(boostedAt.getTime() + 4 * 3600 * 1000),
    };
  }

  async expireBoosts(): Promise<void> {
    await this.jobRepo
      .createQueryBuilder()
      .update(JobEntity)
      .set({ isPremium: false })
      .where('is_premium = true')
      .andWhere(`premium_boosted_at < NOW() - INTERVAL '4 hours'`)
      .execute();
  }

  async getApplicants(companyUserId: string, jobId: string) {
    const company = await this.companyRepo.findOne({ where: { userId: companyUserId } });
    if (!company) throw new ForbiddenException();
    const job = await this.jobRepo.findOne({
      where: { id: jobId, companyId: company.id },
    });
    if (!job) throw new NotFoundException();
    return this.appRepo.find({ where: { jobId } });
  }
}
