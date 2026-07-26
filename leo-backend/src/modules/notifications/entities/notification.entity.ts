// notification.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ type: 'enum', enum: ['chat','job','contract','escrow','payment','withdrawal','review','subscription','system'] }) type: string;
  @Column({ type: 'enum', enum: ['push','whatsapp','sms','email','in_app'], default: 'in_app' }) channel: string;
  @Column() title: string;
  @Column({ type: 'text', nullable: true }) body: string | null;
  @Column({ type: 'jsonb', nullable: true }) data: Record<string, unknown> | null;
  @Column({ name: 'is_read', default: false }) isRead: boolean;
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true }) sentAt: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
