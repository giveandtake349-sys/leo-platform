import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewEntity, ReportEntity } from './entities/dispute.entity';
import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreateReviewDto {
  @IsString() contractId: string;
  @IsString() revieweeUserId: string;
  @IsNumber() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() comment?: string;
}

export class CreateReportDto {
  @IsOptional() @IsString() reportedUserId?: string;
  @IsOptional() @IsString() reportedJobId?: string;
  @IsOptional() @IsString() reportedMessageId?: string;
  @IsString() reason: string;
  @IsOptional() @IsString() description?: string;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity) private reviewRepo: Repository<ReviewEntity>,
    @InjectRepository(ReportEntity) private reportRepo: Repository<ReportEntity>,
  ) {}

  async createReview(reviewerUserId: string, dto: CreateReviewDto): Promise<ReviewEntity> {
    const existing = await this.reviewRepo.findOne({
      where: { contractId: dto.contractId, reviewerUserId },
    });
    if (existing) throw new BadRequestException('Already reviewed this contract');

    return this.reviewRepo.save(
      this.reviewRepo.create({
        contractId: dto.contractId,
        reviewerUserId,
        revieweeUserId: dto.revieweeUserId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      }),
    );
  }

  async getUserReviews(userId: string) {
    return this.reviewRepo.find({
      where: { revieweeUserId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async createReport(reporterUserId: string, dto: CreateReportDto): Promise<ReportEntity> {
    return this.reportRepo.save(
      this.reportRepo.create({ reporterUserId, ...dto }),
    );
  }
}
