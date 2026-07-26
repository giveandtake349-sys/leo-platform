import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('wallets')
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', unique: true }) userId: string;
  @Column({ name: 'available_balance', type: 'numeric', precision: 14, scale: 2, default: 0 }) availableBalance: number;
  @Column({ name: 'pending_balance', type: 'numeric', precision: 14, scale: 2, default: 0 }) pendingBalance: number;
  @Column({ name: 'escrow_balance', type: 'numeric', precision: 14, scale: 2, default: 0 }) escrowBalance: number;
  @Column({ default: 'BDT' }) currency: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @OneToOne(() => UserEntity, (u) => u.wallet) @JoinColumn({ name: 'user_id' }) user: UserEntity;
}

@Entity('wallet_transactions')
export class WalletTransactionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'wallet_id' }) walletId: string;
  @Column({ type: 'enum', enum: ['credit','debit'] }) type: string;
  @Column({ type: 'enum', enum: ['escrow_release','withdrawal','refund','bonus','commission','deposit','job_boost_fee','permanent_job_fee'] })
  category: string;
  @Column({ type: 'numeric', precision: 14, scale: 2 }) amount: number;
  @Column({ name: 'balance_after', type: 'numeric', precision: 14, scale: 2 }) balanceAfter: number;
  @Column({ name: 'reference_type', nullable: true }) referenceType: string | null;
  @Column({ name: 'reference_id', type: 'uuid', nullable: true }) referenceId: string | null;
  @Column({ nullable: true }) description: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}

@Entity('withdrawals')
export class WithdrawalEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'wallet_id' }) walletId: string;
  @Column({ type: 'numeric', precision: 14, scale: 2 }) amount: number;
  @Column({ type: 'enum', enum: ['bkash','nagad','rocket','bank_transfer'] }) method: string;
  @Column({ name: 'account_number_encrypted', type: 'text' }) accountNumberEncrypted: string;
  @Column({ type: 'enum', enum: ['pending','processing','completed','failed'], default: 'pending' }) status: string;
  @Column({ name: 'requested_at', type: 'timestamptz', default: () => 'NOW()' }) requestedAt: Date;
  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true }) processedAt: Date | null;
  @Column({ name: 'failure_reason', nullable: true }) failureReason: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
