import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { KycVerificationEntity } from '../kyc/entities/kyc-verification.entity';
import { ReportEntity, DisputeEntity } from '../reviews/entities/dispute.entity';
import { AuditLogEntity, FeatureFlagEntity } from './entities/admin-user.entity';
import { WithdrawalEntity } from '../wallet/entities/wallet.entity';
import { paginationParams, paginate } from '../../common/utils/pagination.util';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
    @InjectRepository(KycVerificationEntity)
    private kycRepo: Repository<KycVerificationEntity>,
    @InjectRepository(ReportEntity) private reportRepo: Repository<ReportEntity>,
    @InjectRepository(DisputeEntity) private disputeRepo: Repository<DisputeEntity>,
    @InjectRepository(AuditLogEntity) private auditRepo: Repository<AuditLogEntity>,
    @InjectRepository(FeatureFlagEntity) private flagRepo: Repository<FeatureFlagEntity>,
    @InjectRepository(WithdrawalEntity)
    private withdrawalRepo: Repository<WithdrawalEntity>,
  ) {}

  async listUsers(query: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
  }) {
    const { skip, take, page, limit } = paginationParams(query);
    const qb = this.userRepo.createQueryBuilder('u').where('u.deleted_at IS NULL');
    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query.status) qb.andWhere('u.status = :status', { status: query.status });
    const [data, total] = await qb.skip(skip).take(take).getManyAndCount();
    return paginate(data, total, page, limit);
  }

  async suspendUser(adminId: string, userId: string): Promise<void> {
    const before = await this.userRepo.findOne({ where: { id: userId } });
    await this.userRepo.update(userId, { status: 'suspended' });
    await this.writeAudit(adminId, 'user.suspend', 'user', userId, before, {
      status: 'suspended',
    });
  }

  async reinstateUser(adminId: string, userId: string): Promise<void> {
    await this.userRepo.update(userId, { status: 'active' });
    await this.writeAudit(adminId, 'user.reinstate', 'user', userId, null, {
      status: 'active',
    });
  }

  async getPendingKyc(query: { page?: number; limit?: number }) {
    const { skip, take, page, limit } = paginationParams(query);
    const [data, total] = await this.kycRepo.findAndCount({
      where: { status: 'pending' },
      skip,
      take,
      order: { createdAt: 'ASC' },
    });
    return paginate(data, total, page, limit);
  }

  async approveKyc(adminId: string, kycId: string): Promise<void> {
    const before = await this.kycRepo.findOne({ where: { id: kycId } });
    await this.kycRepo.update(kycId, {
      status: 'approved',
      reviewedByAdminId: adminId,
      reviewedAt: new Date(),
    });
    await this.writeAudit(adminId, 'kyc.approve', 'kyc_verification', kycId, before, {
      status: 'approved',
    });
  }

  async rejectKyc(adminId: string, kycId: string, reason: string): Promise<void> {
    await this.kycRepo.update(kycId, {
      status: 'rejected',
      reviewedByAdminId: adminId,
      reviewedAt: new Date(),
      rejectionReason: reason,
    });
    await this.writeAudit(adminId, 'kyc.reject', 'kyc_verification', kycId, null, {
      status: 'rejected',
      reason,
    });
  }

  async getDisputes(query: { page?: number; limit?: number }) {
    const { skip, take, page, limit } = paginationParams(query);
    const [data, total] = await this.disputeRepo.findAndCount({
      where: { status: 'open' },
      skip,
      take,
      order: { createdAt: 'ASC' },
    });
    return paginate(data, total, page, limit);
  }

  async resolveDispute(
    adminId: string,
    disputeId: string,
    outcome: string,
    notes: string,
  ): Promise<void> {
    await this.disputeRepo.update(disputeId, {
      status: outcome as any,
      resolutionNotes: notes,
      resolvedByAdminId: adminId,
      resolvedAt: new Date(),
    });
    await this.writeAudit(adminId, 'dispute.resolve', 'dispute', disputeId, null, {
      outcome,
      notes,
    });
  }

  async getReports(query: { page?: number; limit?: number }) {
    const { skip, take, page, limit } = paginationParams(query);
    const [data, total] = await this.reportRepo.findAndCount({
      where: { status: 'open' },
      skip,
      take,
    });
    return paginate(data, total, page, limit);
  }

  async getPendingWithdrawals(query: { page?: number; limit?: number }) {
    const { skip, take, page, limit } = paginationParams(query);
    const [data, total] = await this.withdrawalRepo.findAndCount({
      where: { status: 'pending' },
      order: { requestedAt: 'ASC' },
      skip,
      take,
    });
    return paginate(data, total, page, limit);
  }

  async getAuditLogs(entityType: string, entityId: string) {
    return this.auditRepo.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  async getFlags(): Promise<FeatureFlagEntity[]> {
    return this.flagRepo.find();
  }

  async toggleFlag(key: string, isEnabled: boolean): Promise<void> {
    await this.flagRepo.upsert({ key, isEnabled }, ['key']);
  }

  private async writeAudit(
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    await this.auditRepo.save(
      this.auditRepo.create({
        actorId,
        actorType: 'admin',
        action,
        entityType,
        entityId,
        beforeState: before as any,
        afterState: after as any,
      }),
    );
  }
}
