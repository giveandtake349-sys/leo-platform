import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ContractEntity } from './entities/contract.entity';
import { MilestoneEntity } from './entities/contract.entity';
import { WalletService } from '../wallet/wallet.service';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { IsString, IsEnum, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateContractDto {
  @IsString() jobId: string;
  @IsString() workerUserId: string;
  @IsEnum(['offline_short_contract', 'permanent', 'online_freelance']) contractType: string;
  @IsOptional() @IsNumber() rateAmount?: number;
  @IsOptional() @IsString() ratePeriod?: string;
  @IsOptional() @IsNumber() durationDays?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsString() chatId?: string;
}

export class CreateMilestoneDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() amount: number;
  @IsOptional() @IsDateString() dueDate?: string;
}

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(ContractEntity) private contractRepo: Repository<ContractEntity>,
    @InjectRepository(MilestoneEntity) private milestoneRepo: Repository<MilestoneEntity>,
    private readonly walletService: WalletService,
    private readonly chatService: ChatService,
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async create(employerUserId: string, dto: CreateContractDto): Promise<ContractEntity> {
    const fees = this.calculateFees(dto.contractType, dto.rateAmount);
    const contract = this.contractRepo.create({
      jobId: dto.jobId,
      employerUserId,
      workerUserId: dto.workerUserId,
      contractType: dto.contractType,
      rateAmount: dto.rateAmount ?? null,
      ratePeriod: dto.ratePeriod ?? null,
      durationDays: dto.durationDays ?? null,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      chatId: dto.chatId ?? null,
      employerFeeBdt: fees.employerFee,
      workerFeeBdt: fees.workerFee,
      status: 'pending_payment',
    });
    return this.contractRepo.save(contract);
  }

  async recordFeePaid(
    contractId: string,
    payerUserId: string,
    role: 'employer' | 'worker',
  ): Promise<ContractEntity> {
    const contract = await this.findById(contractId);
    if (contract.employerUserId !== payerUserId && contract.workerUserId !== payerUserId) {
      throw new ForbiddenException();
    }

    if (role === 'employer') {
      await this.contractRepo.update(contractId, { employerFeePaid: true });
    } else {
      await this.contractRepo.update(contractId, { workerFeePaid: true });
    }

    const updated = await this.findById(contractId);
    const bothPaid = this.checkBothPaid(updated);

    if (bothPaid) {
      await this.contractRepo.update(contractId, { status: 'active' });
      if (updated.chatId) {
        await this.chatService.unlockContacts(updated.chatId);
      }
      await this.notificationsService.send({
        userId: updated.employerUserId,
        type: 'contract',
        title: 'Contract Activated!',
        body: 'Payment confirmed. Contact details are now unlocked.',
      });
      await this.notificationsService.send({
        userId: updated.workerUserId,
        type: 'contract',
        title: 'Contract Activated!',
        body: 'Payment confirmed. Contact details are now unlocked.',
      });
    }

    return this.findById(contractId);
  }

  async addMilestone(
    employerUserId: string,
    contractId: string,
    dto: CreateMilestoneDto,
  ): Promise<MilestoneEntity> {
    const contract = await this.findById(contractId);
    if (contract.employerUserId !== employerUserId) throw new ForbiddenException();
    if (contract.contractType !== 'online_freelance') {
      throw new BadRequestException('Milestones only for online freelance contracts');
    }
    return this.milestoneRepo.save(
      this.milestoneRepo.create({
        contractId,
        title: dto.title,
        description: dto.description ?? null,
        amount: dto.amount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      }),
    );
  }

  async submitMilestone(workerUserId: string, milestoneId: string): Promise<MilestoneEntity> {
    const ms = await this.milestoneRepo.findOne({
      where: { id: milestoneId },
      relations: ['contract'],
    });
    if (!ms) throw new NotFoundException();
    if ((ms as any).contract.workerUserId !== workerUserId) throw new ForbiddenException();
    if (ms.status !== 'pending' && ms.status !== 'revision_requested') {
      throw new BadRequestException('Cannot submit milestone in current status');
    }
    await this.milestoneRepo.update(milestoneId, {
      status: 'submitted',
      submittedAt: new Date(),
    });
    return this.milestoneRepo.findOne({ where: { id: milestoneId } }) as Promise<MilestoneEntity>;
  }

  async approveMilestone(employerUserId: string, milestoneId: string): Promise<MilestoneEntity> {
    const ms = await this.milestoneRepo.findOne({
      where: { id: milestoneId },
      relations: ['contract'],
    });
    if (!ms) throw new NotFoundException();
    if ((ms as any).contract.employerUserId !== employerUserId) throw new ForbiddenException();
    if (ms.status !== 'submitted') throw new BadRequestException('Milestone is not in submitted state');
    await this.milestoneRepo.update(milestoneId, {
      status: 'approved',
      approvedAt: new Date(),
    });
    return this.milestoneRepo.findOne({ where: { id: milestoneId } }) as Promise<MilestoneEntity>;
  }

  async requestRevision(employerUserId: string, milestoneId: string): Promise<MilestoneEntity> {
    const ms = await this.milestoneRepo.findOne({
      where: { id: milestoneId },
      relations: ['contract'],
    });
    if (!ms) throw new NotFoundException();
    if ((ms as any).contract.employerUserId !== employerUserId) throw new ForbiddenException();
    if (ms.status !== 'submitted') throw new BadRequestException();
    await this.milestoneRepo.update(milestoneId, { status: 'revision_requested' });
    return this.milestoneRepo.findOne({ where: { id: milestoneId } }) as Promise<MilestoneEntity>;
  }

  async findById(id: string): Promise<ContractEntity> {
    const c = await this.contractRepo.findOne({
      where: { id },
      relations: ['milestones'],
    });
    if (!c) throw new NotFoundException('Contract not found');
    return c;
  }

  async findMyContracts(userId: string) {
    return this.contractRepo.find({
      where: [{ employerUserId: userId }, { workerUserId: userId }],
      order: { createdAt: 'DESC' },
    });
  }

  private calculateFees(
    type: string,
    rateAmount?: number,
  ): { employerFee: number; workerFee: number } {
    if (type === 'permanent') return { employerFee: 250, workerFee: 250 };
    if (type === 'offline_short_contract' && rateAmount) {
      return { employerFee: 0, workerFee: rateAmount * 0.02 };
    }
    return { employerFee: 0, workerFee: 0 };
  }

  private checkBothPaid(c: ContractEntity): boolean {
    if (c.contractType === 'permanent') return c.employerFeePaid && c.workerFeePaid;
    if (c.contractType === 'offline_short_contract') return c.workerFeePaid;
    return true;
  }
}
