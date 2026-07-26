// subscription.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('subscriptions')
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ type: 'enum', enum: ['worker_premium','employer_premium'] }) plan: string;
  @Column({ name: 'amount_bdt', type: 'numeric', precision: 10, scale: 2, default: 100 }) amountBdt: number;
  @Column({ type: 'enum', enum: ['active','expired','cancelled'], default: 'active' }) status: string;
  @Column({ name: 'starts_at', type: 'timestamptz', default: () => 'NOW()' }) startsAt: Date;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt: Date;
  @Column({ name: 'auto_renew', default: false }) autoRenew: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
