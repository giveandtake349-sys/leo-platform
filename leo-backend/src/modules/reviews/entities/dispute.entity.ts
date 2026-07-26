// review.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reviews')
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'contract_id' }) contractId: string;
  @Column({ name: 'reviewer_user_id' }) reviewerUserId: string;
  @Column({ name: 'reviewee_user_id' }) revieweeUserId: string;
  @Column({ type: 'smallint' }) rating: number;
  @Column({ type: 'text', nullable: true }) comment: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt: Date | null;
}

@Entity('reports')
export class ReportEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'reporter_user_id' }) reporterUserId: string;
  @Column({ name: 'reported_user_id', nullable: true }) reportedUserId: string | null;
  @Column({ name: 'reported_job_id', nullable: true }) reportedJobId: string | null;
  @Column({ name: 'reported_message_id', nullable: true }) reportedMessageId: string | null;
  @Column() reason: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'enum', enum: ['open','reviewing','resolved','dismissed'], default: 'open' }) status: string;
  @Column({ name: 'resolved_by_admin_id', nullable: true }) resolvedByAdminId: string | null;
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true }) resolvedAt: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity('disputes')
export class DisputeEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'contract_id' }) contractId: string;
  @Column({ name: 'escrow_id', nullable: true }) escrowId: string | null;
  @Column({ name: 'raised_by_user_id' }) raisedByUserId: string;
  @Column({ name: 'against_user_id' }) againstUserId: string;
  @Column() reason: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'enum', enum: ['open','under_review','resolved_employer','resolved_worker','resolved_split','closed'], default: 'open' }) status: string;
  @Column({ name: 'resolution_notes', type: 'text', nullable: true }) resolutionNotes: string | null;
  @Column({ name: 'resolved_by_admin_id', nullable: true }) resolvedByAdminId: string | null;
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true }) resolvedAt: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
