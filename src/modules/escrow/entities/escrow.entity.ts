import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

export type EscrowStatus =
  | 'draft' | 'pending' | 'funded' | 'active'
  | 'submitted' | 'revision' | 'approved' | 'released'
  | 'refunded' | 'cancelled' | 'disputed' | 'closed';

@Entity('escrows')
export class EscrowEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'contract_id' }) contractId: string;
  @Column({ name: 'milestone_id', nullable: true, unique: true }) milestoneId: string | null;
  @Column({ type: 'numeric', precision: 12, scale: 2 }) amount: number;
  @Column({ default: 'BDT' }) currency: string;
  @Column({
    type: 'enum',
    enum: ['draft','pending','funded','active','submitted','revision','approved','released','refunded','cancelled','disputed','closed'],
    default: 'draft',
  })
  status: EscrowStatus;
  @Column({ name: 'funded_at', type: 'timestamptz', nullable: true }) fundedAt: Date | null;
  @Column({ name: 'released_at', type: 'timestamptz', nullable: true }) releasedAt: Date | null;
  @Column({ name: 'refunded_at', type: 'timestamptz', nullable: true }) refundedAt: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity('escrow_transitions')
export class EscrowTransitionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'escrow_id' }) escrowId: string;
  @Column({ name: 'from_status', nullable: true }) fromStatus: EscrowStatus | null;
  @Column({ name: 'to_status' }) toStatus: EscrowStatus;
  @Column({ name: 'actor_user_id', nullable: true }) actorUserId: string | null;
  @Column({ nullable: true }) reason: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
