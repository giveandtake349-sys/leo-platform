import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EscrowEntity, EscrowStatus, EscrowTransitionEntity } from './entities/escrow.entity';
import { EscrowStateMachine } from './escrow.state-machine';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DisputeEntity } from '../reviews/entities/dispute.entity';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateEscrowDto {
  @IsString() contractId: string;
  @IsOptional() @IsString() milestoneId?: string;
  @IsNumber() amount: number;
}

export class OpenDisputeDto {
  @IsString() reason: string;
  @IsOptional() @IsString() description?: string;
}

@Injectable()
export class EscrowService {
  constructor(
    @InjectRepository(EscrowEntity) private escrowRepo: Repository<EscrowEntity>,
    @InjectRepository(EscrowTransitionEntity)
    private transitionRepo: Repository<EscrowTransitionEntity>,
    @InjectRepository(DisputeEntity) private disputeRepo: Repository<DisputeEntity>,
    private readonly walletService: WalletService,
    private readonly notifications: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(employerUserId: string, dto: CreateEscrowDto): Promise<EscrowEntity> {
    return this.dataSource.transaction(async (em) => {
      const escrow = em.create(EscrowEntity, {
        contractId: dto.contractId,
        milestoneId: dto.milestoneId ?? null,
        amount: dto.amount,
        status: 'draft' as EscrowStatus,
      });
      await em.save(escrow);
      await em.save(
        em.create(EscrowTransitionEntity, {
          escrowId: escrow.id,
          fromStatus: null,
          toStatus: 'draft' as EscrowStatus,
          actorUserId: employerUserId,
        }),
      );
      return escrow;
    });
  }

  async markFunded(escrowId: string, actorUserId: string): Promise<EscrowEntity> {
    const escrow = await this.findById(escrowId);
    EscrowStateMachine.assertTransition(escrow.status, 'funded');

    return this.dataSource.transaction(async (em) => {
      await em.update(EscrowEntity, escrowId, { status: 'funded', fundedAt: new Date() });
      await em.save(
        em.create(EscrowTransitionEntity, {
          escrowId,
          fromStatus: escrow.status,
          toStatus: 'funded' as EscrowStatus,
          actorUserId,
        }),
      );
      // Auto-advance funded → active
      await em.update(EscrowEntity, escrowId, { status: 'active' });
      await em.save(
        em.create(EscrowTransitionEntity, {
          escrowId,
          fromStatus: 'funded' as EscrowStatus,
          toStatus: 'active' as EscrowStatus,
          actorUserId: 'system',
        }),
      );
      await this.walletService.lockEscrow(actorUserId, escrow.amount, escrowId);
      return em.findOne(EscrowEntity, { where: { id: escrowId } }) as Promise<EscrowEntity>;
    });
  }

  async release(escrowId: string, employerUserId: string): Promise<EscrowEntity> {
    const escrow = await this.findById(escrowId);
    EscrowStateMachine.assertTransition(escrow.status, 'released');

    return this.dataSource.transaction(async (em) => {
      await em.update(EscrowEntity, escrowId, {
        status: 'released',
        releasedAt: new Date(),
      });
      await em.save(
        em.create(EscrowTransitionEntity, {
          escrowId,
          fromStatus: escrow.status,
          toStatus: 'released' as EscrowStatus,
          actorUserId: employerUserId,
        }),
      );
      await this.walletService.releaseEscrowToWorker(
        escrow.contractId,
        escrow.amount,
        escrowId,
      );
      await this.notifications.send({
        userId: employerUserId,
        type: 'escrow',
        title: 'Payment Released',
        body: `৳${escrow.amount} has been released to the worker.`,
      });
      return em.findOne(EscrowEntity, { where: { id: escrowId } }) as Promise<EscrowEntity>;
    });
  }

  async refund(escrowId: string, actorUserId: string): Promise<EscrowEntity> {
    const escrow = await this.findById(escrowId);
    EscrowStateMachine.assertTransition(escrow.status, 'refunded');

    return this.dataSource.transaction(async (em) => {
      await em.update(EscrowEntity, escrowId, {
        status: 'refunded',
        refundedAt: new Date(),
      });
      await em.save(
        em.create(EscrowTransitionEntity, {
          escrowId,
          fromStatus: escrow.status,
          toStatus: 'refunded' as EscrowStatus,
          actorUserId,
        }),
      );
      await this.walletService.refundEscrow(escrow.contractId, escrow.amount, escrowId);
      return em.findOne(EscrowEntity, { where: { id: escrowId } }) as Promise<EscrowEntity>;
    });
  }

  async openDispute(
    escrowId: string,
    raisedByUserId: string,
    dto: OpenDisputeDto,
  ): Promise<{ disputeId: string; escrowStatus: string }> {
    const escrow = await this.findById(escrowId);
    if (EscrowStateMachine.isTerminal(escrow.status)) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Escrow is already in a terminal state',
      });
    }

    return this.dataSource.transaction(async (em) => {
      await em.update(EscrowEntity, escrowId, { status: 'disputed' });
      await em.save(
        em.create(EscrowTransitionEntity, {
          escrowId,
          fromStatus: escrow.status,
          toStatus: 'disputed' as EscrowStatus,
          actorUserId: raisedByUserId,
          reason: dto.reason,
        }),
      );
      const dispute = await em.save(
        em.create(DisputeEntity, {
          contractId: escrow.contractId,
          escrowId,
          raisedByUserId,
          againstUserId: raisedByUserId,
          reason: dto.reason,
          description: dto.description ?? null,
        }),
      );
      return { disputeId: dispute.id, escrowStatus: 'disputed' };
    });
  }

  async findById(id: string): Promise<EscrowEntity> {
    const e = await this.escrowRepo.findOne({ where: { id } });
    if (!e) throw new NotFoundException('Escrow not found');
    return e;
  }

  async getTransitions(escrowId: string): Promise<EscrowTransitionEntity[]> {
    return this.transitionRepo.find({
      where: { escrowId },
      order: { createdAt: 'ASC' },
    });
  }
}
