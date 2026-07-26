import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WorkerProfileEntity,
  WorkerSkillEntity,
  WorkerPortfolioEntity,
  WorkerCertificateEntity,
} from './entities/worker-profile.entity';
import {
  IsString, IsOptional, IsNumber, IsEnum,
  IsArray, IsBoolean, MaxLength,
} from 'class-validator';

export class CreateWorkerProfileDto {
  @IsString() @MaxLength(120) fullName: string;
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsNumber() experienceYears?: number;
  @IsOptional() @IsString() education?: string;
  @IsOptional() @IsArray() languages?: string[];
  @IsEnum(['offline', 'online', 'both']) availabilityMode: string;
  @IsOptional() @IsString() division?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() thana?: string;
  @IsOptional() @IsNumber() locationLat?: number;
  @IsOptional() @IsNumber() locationLng?: number;
}

export class ToggleOpenToWorkDto {
  @IsBoolean() openToWork: boolean;
}

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(WorkerProfileEntity)
    private profileRepo: Repository<WorkerProfileEntity>,
    @InjectRepository(WorkerSkillEntity)
    private skillRepo: Repository<WorkerSkillEntity>,
    @InjectRepository(WorkerPortfolioEntity)
    private portfolioRepo: Repository<WorkerPortfolioEntity>,
    @InjectRepository(WorkerCertificateEntity)
    private certRepo: Repository<WorkerCertificateEntity>,
  ) {}

  async create(userId: string, dto: CreateWorkerProfileDto): Promise<WorkerProfileEntity> {
    const exists = await this.profileRepo.findOne({ where: { userId } });
    if (exists) throw new ConflictException('Worker profile already exists');
    const profile = this.profileRepo.create({ ...dto, userId });
    profile.profileStrength = this.calcProfileStrength(profile);
    return this.profileRepo.save(profile);
  }

  async findById(id: string): Promise<WorkerProfileEntity> {
    const p = await this.profileRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Worker not found');
    return p;
  }

  async findByUserId(userId: string): Promise<WorkerProfileEntity> {
    const p = await this.profileRepo.findOne({ where: { userId } });
    if (!p) throw new NotFoundException('Worker profile not found');
    return p;
  }

  async update(
    userId: string,
    dto: Partial<CreateWorkerProfileDto>,
  ): Promise<WorkerProfileEntity> {
    const p = await this.findByUserId(userId);
    Object.assign(p, dto);
    p.profileStrength = this.calcProfileStrength(p);
    return this.profileRepo.save(p);
  }

  async toggleOpenToWork(userId: string, dto: ToggleOpenToWorkDto): Promise<void> {
    const p = await this.findByUserId(userId);
    await this.profileRepo.update(p.id, { openToWork: dto.openToWork });
  }

  async addSkill(
    userId: string,
    skillId: string,
    yearsExperience?: number,
  ): Promise<WorkerSkillEntity> {
    const p = await this.findByUserId(userId);
    const sk = this.skillRepo.create({
      workerId: p.id,
      skillId,
      yearsExperience: yearsExperience ?? null,
    });
    return this.skillRepo.save(sk);
  }

  async removeSkill(userId: string, skillId: string): Promise<void> {
    const p = await this.findByUserId(userId);
    await this.skillRepo.delete({ workerId: p.id, skillId });
  }

  async addPortfolio(
    userId: string,
    data: { title: string; description?: string; fileUrl: string },
  ): Promise<WorkerPortfolioEntity> {
    const p = await this.findByUserId(userId);
    return this.portfolioRepo.save(
      this.portfolioRepo.create({ workerId: p.id, ...data }),
    );
  }

  async addCertificate(
    userId: string,
    data: { title: string; issuer?: string; fileUrl: string; issuedAt?: Date },
  ): Promise<WorkerCertificateEntity> {
    const p = await this.findByUserId(userId);
    return this.certRepo.save(
      this.certRepo.create({ workerId: p.id, ...data }),
    );
  }

  private calcProfileStrength(p: Partial<WorkerProfileEntity>): number {
    let score = 20;
    if (p.photoUrl) score += 15;
    if (p.bio) score += 10;
    if (p.experienceYears) score += 10;
    if (p.education) score += 10;
    if (p.languages?.length) score += 10;
    if (p.locationLat) score += 10;
    if (p.district) score += 5;
    return Math.min(100, score);
  }
}
