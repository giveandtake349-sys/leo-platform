import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';

@Entity('contracts')
export class ContractEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'job_id' }) jobId: string;
  @Column({ name: 'employer_user_id' }) employerUserId: string;
  @Column({ name: 'worker_user_id' }) workerUserId: string;
  @Column({ name: 'contract_type', type: 'enum', enum: ['offline_short_contract','permanent','online_freelance'] })
  contractType: string;
  @Column({ type: 'enum', enum: ['draft','pending_payment','active','completed','cancelled','disputed'], default: 'draft' })
  status: string;
  @Column({ name: 'rate_amount', type: 'numeric', precision: 12, scale: 2, nullable: true }) rateAmount: number | null;
  @Column({ name: 'rate_period', nullable: true }) ratePeriod: string | null;
  @Column({ name: 'duration_days', type: 'smallint', nullable: true }) durationDays: number | null;
  @Column({ name: 'employer_fee_bdt', type: 'numeric', precision: 10, scale: 2, nullable: true }) employerFeeBdt: number | null;
  @Column({ name: 'worker_fee_bdt', type: 'numeric', precision: 10, scale: 2, nullable: true }) workerFeeBdt: number | null;
  @Column({ name: 'employer_fee_paid', default: false }) employerFeePaid: boolean;
  @Column({ name: 'worker_fee_paid', default: false }) workerFeePaid: boolean;
  @Column({ name: 'start_date', type: 'date', nullable: true }) startDate: Date | null;
  @Column({ name: 'end_date', type: 'date', nullable: true }) endDate: Date | null;
  @Column({ name: 'chat_id', nullable: true }) chatId: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @OneToMany(() => MilestoneEntity, (m) => m.contract) milestones: MilestoneEntity[];
}

@Entity('milestones')
export class MilestoneEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'contract_id' }) contractId: string;
  @Column() title: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'numeric', precision: 12, scale: 2 }) amount: number;
  @Column({ type: 'enum', enum: ['pending','submitted','revision_requested','approved','released'], default: 'pending' })
  status: string;
  @Column({ name: 'due_date', type: 'date', nullable: true }) dueDate: Date | null;
  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true }) submittedAt: Date | null;
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true }) approvedAt: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @ManyToOne(() => ContractEntity, (c) => c.milestones) @JoinColumn({ name: 'contract_id' }) contract: ContractEntity;
}
