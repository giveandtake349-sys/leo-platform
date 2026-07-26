import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WalletEntity, WalletTransactionEntity, WithdrawalEntity } from './entities/wallet.entity';
import { ContractEntity } from '../contracts/entities/contract.entity';
import { encrypt } from '../../common/utils/crypto.util';
import { ConfigService } from '@nestjs/config';
import { paginationParams, paginate } from '../../common/utils/pagination.util';
import { IsEnum, IsNumber, IsString, Min } from 'class-validator';

export class WithdrawDto {
  @IsNumber() @Min(100) amount: number;
  @IsEnum(['bkash', 'nagad', 'rocket', 'bank_transfer']) method: string;
  @IsString() accountNumber: string;
}

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletEntity) private walletRepo: Repository<WalletEntity>,
    @InjectRepository(WalletTransactionEntity)
    private txRepo: Repository<WalletTransactionEntity>,
    @InjectRepository(WithdrawalEntity)
    private withdrawRepo: Repository<WithdrawalEntity>,
    @InjectRepository(ContractEntity)
    private contractRepo: Repository<ContractEntity>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async getWallet(userId: string): Promise<WalletEntity> {
    const w = await this.walletRepo.findOne({ where: { userId } });
    if (!w) throw new NotFoundException('Wallet not found');
    return w;
  }

  async getTransactions(userId: string, query: { page?: number; limit?: number }) {
    const wallet = await this.getWallet(userId);
    const { skip, take, page, limit } = paginationParams(query);
    const [data, total] = await this.txRepo.findAndCount({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return paginate(data, total, page, limit);
  }

  async requestWithdrawal(userId: string, dto: WithdrawDto): Promise<WithdrawalEntity> {
    const minBdt = this.config.get<number>('WITHDRAWAL_MINIMUM_BDT', 100);
    if (dto.amount < minBdt) {
      throw new UnprocessableEntityException({
        code: 'WITHDRAWAL_BELOW_MINIMUM',
        message: `Minimum withdrawal is ৳${minBdt}`,
      });
    }

    return this.dataSource.transaction(async (em) => {
      const wallet = await em.findOne(WalletEntity, { where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');
      if (Number(wallet.availableBalance) < dto.amount) {
        throw new UnprocessableEntityException({
          code: 'WITHDRAWAL_INSUFFICIENT_BALANCE',
          message: 'Insufficient balance',
        });
      }

      const newBalance = Number(wallet.availableBalance) - dto.amount;
      await em.update(WalletEntity, wallet.id, { availableBalance: newBalance });

      await em.save(
        em.create(WalletTransactionEntity, {
          walletId: wallet.id,
          type: 'debit',
          category: 'withdrawal',
          amount: dto.amount,
          balanceAfter: newBalance,
          referenceType: 'withdrawal',
          description: `Withdrawal via ${dto.method}`,
        }),
      );

      return em.save(
        em.create(WithdrawalEntity, {
          walletId: wallet.id,
          amount: dto.amount,
          method: dto.method,
          accountNumberEncrypted: encrypt(dto.accountNumber),
          status: 'pending',
        }),
      );
    });
  }

  async lockEscrow(userId: string, amount: number, escrowId: string): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      const wallet = await em.findOne(WalletEntity, { where: { userId } });
      if (!wallet) throw new NotFoundException();
      await em.update(WalletEntity, wallet.id, {
        escrowBalance: Number(wallet.escrowBalance) + amount,
      });
      await em.save(
        em.create(WalletTransactionEntity, {
          walletId: wallet.id,
          type: 'debit',
          category: 'deposit',
          amount,
          balanceAfter: Number(wallet.availableBalance),
          referenceType: 'escrow',
          referenceId: escrowId,
          description: 'Escrow funded',
        }),
      );
    });
  }

  async releaseEscrowToWorker(
    contractId: string,
    amount: number,
    escrowId: string,
  ): Promise<void> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contract not found');

    await this.dataSource.transaction(async (em) => {
      const empWallet = await em.findOne(WalletEntity, {
        where: { userId: contract.employerUserId },
      });
      if (empWallet) {
        await em.update(WalletEntity, empWallet.id, {
          escrowBalance: Math.max(0, Number(empWallet.escrowBalance) - amount),
        });
      }

      const wrkWallet = await em.findOne(WalletEntity, {
        where: { userId: contract.workerUserId },
      });
      if (!wrkWallet) throw new NotFoundException('Worker wallet not found');

      const newBalance = Number(wrkWallet.availableBalance) + amount;
      await em.update(WalletEntity, wrkWallet.id, { availableBalance: newBalance });
      await em.save(
        em.create(WalletTransactionEntity, {
          walletId: wrkWallet.id,
          type: 'credit',
          category: 'escrow_release',
          amount,
          balanceAfter: newBalance,
          referenceType: 'escrow',
          referenceId: escrowId,
          description: 'Escrow released by employer',
        }),
      );
    });
  }

  async refundEscrow(contractId: string, amount: number, escrowId: string): Promise<void> {
    const contract = await this.contractRepo.findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundException();

    await this.dataSource.transaction(async (em) => {
      const empWallet = await em.findOne(WalletEntity, {
        where: { userId: contract.employerUserId },
      });
      if (!empWallet) throw new NotFoundException();

      const newBalance = Number(empWallet.availableBalance) + amount;
      await em.update(WalletEntity, empWallet.id, {
        availableBalance: newBalance,
        escrowBalance: Math.max(0, Number(empWallet.escrowBalance) - amount),
      });
      await em.save(
        em.create(WalletTransactionEntity, {
          walletId: empWallet.id,
          type: 'credit',
          category: 'refund',
          amount,
          balanceAfter: newBalance,
          referenceType: 'escrow',
          referenceId: escrowId,
          description: 'Escrow refunded',
        }),
      );
    });
  }

  async getMyWithdrawals(userId: string, query: { page?: number; limit?: number }) {
    const wallet = await this.getWallet(userId);
    const { skip, take, page, limit } = paginationParams(query);
    const [data, total] = await this.withdrawRepo.findAndCount({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return paginate(data, total, page, limit);
  }
}
