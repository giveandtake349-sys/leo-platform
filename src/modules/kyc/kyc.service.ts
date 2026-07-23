import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycVerificationEntity } from './entities/kyc-verification.entity';
import { encrypt, hashForLookup } from '../../common/utils/crypto.util';
import { IsEnum, IsString, IsOptional } from 'class-validator';

export class SubmitKycDto {
  @IsEnum(['nid', 'passport', 'trade_license'])
  documentType: string;

  @IsString()
  documentNumber: string;

  @IsString()
  documentFrontUrl: string;

  @IsOptional()
  @IsString()
  documentBackUrl?: string;

  @IsOptional()
  @IsString()
  selfieUrl?: string;
}

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(KycVerificationEntity)
    private repo: Repository<KycVerificationEntity>,
  ) {}

  async submit(userId: string, dto: SubmitKycDto): Promise<KycVerificationEntity> {
    return this.repo.save(
      this.repo.create({
        userId,
        documentType: dto.documentType,
        documentNumberEncrypted: encrypt(dto.documentNumber),
        documentNumberHash: hashForLookup(dto.documentNumber),
        documentFrontUrl: dto.documentFrontUrl,
        documentBackUrl: dto.documentBackUrl ?? null,
        selfieUrl: dto.selfieUrl ?? null,
        status: 'pending',
      }),
    );
  }

  async getMyStatus(userId: string): Promise<KycVerificationEntity | null> {
    return this.repo.findOne({ where: { userId }, order: { createdAt: 'DESC' } });
  }
}
