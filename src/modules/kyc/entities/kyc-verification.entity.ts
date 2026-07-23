// kyc-verification.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('kyc_verifications')
export class KycVerificationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ name: 'document_type', type: 'enum', enum: ['nid','passport','trade_license'] }) documentType: string;
  @Column({ name: 'document_number_encrypted', type: 'text' }) documentNumberEncrypted: string;
  @Column({ name: 'document_number_hash' }) documentNumberHash: string;
  @Column({ name: 'document_front_url' }) documentFrontUrl: string;
  @Column({ name: 'document_back_url', nullable: true }) documentBackUrl: string | null;
  @Column({ name: 'selfie_url', nullable: true }) selfieUrl: string | null;
  @Column({ type: 'enum', enum: ['pending','approved','rejected'], default: 'pending' }) status: string;
  @Column({ name: 'reviewed_by_admin_id', nullable: true }) reviewedByAdminId: string | null;
  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true }) reviewedAt: Date | null;
  @Column({ name: 'rejection_reason', nullable: true }) rejectionReason: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
