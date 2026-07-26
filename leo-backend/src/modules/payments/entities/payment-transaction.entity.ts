// payment-transaction.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payment_transactions')
export class PaymentTransactionEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ name: 'payable_type' }) payableType: string;
  @Column({ name: 'payable_id', type: 'uuid', nullable: true }) payableId: string | null;
  @Column({ type: 'enum', enum: ['bkash','nagad','rocket','sslcommerz','stripe','manual_bank'] }) gateway: string;
  @Column({ name: 'gateway_reference', nullable: true }) gatewayReference: string | null;
  @Column({ type: 'numeric', precision: 14, scale: 2 }) amount: number;
  @Column({ default: 'BDT' }) currency: string;
  @Column({ type: 'enum', enum: ['initiated','pending','success','failed','refunded'], default: 'initiated' }) status: string;
  @Column({ name: 'idempotency_key', unique: true }) idempotencyKey: string;
  @Column({ name: 'webhook_payload', type: 'jsonb', nullable: true }) webhookPayload: Record<string, unknown> | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
