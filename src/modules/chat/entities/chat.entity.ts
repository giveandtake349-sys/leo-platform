import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('chats')
export class ChatEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'job_id', nullable: true }) jobId: string | null;
  @Column({ name: 'employer_user_id' }) employerUserId: string;
  @Column({ name: 'worker_user_id' }) workerUserId: string;
  @Column({ type: 'enum', enum: ['locked','active','archived'], default: 'locked' }) status: string;
  @Column({ name: 'contact_unlocked', default: false }) contactUnlocked: boolean;
  @Column({ name: 'contact_unlocked_at', type: 'timestamptz', nullable: true }) contactUnlockedAt: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @OneToMany(() => MessageEntity, (m) => m.chat) messages: MessageEntity[];
}

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'chat_id' }) chatId: string;
  @Column({ name: 'sender_id' }) senderId: string;
  @Column({ name: 'message_type', type: 'enum', enum: ['text','voice','image','pdf','location','quick_reply'], default: 'text' })
  messageType: string;
  @Column({ type: 'text', nullable: true }) content: string | null;
  @Column({ name: 'is_read', default: false }) isRead: boolean;
  @Column({ name: 'is_flagged', default: false }) isFlagged: boolean;
  @Column({ name: 'flagged_reason', nullable: true }) flaggedReason: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @ManyToOne(() => ChatEntity, (c) => c.messages) @JoinColumn({ name: 'chat_id' }) chat: ChatEntity;
  @OneToMany(() => MessageAttachmentEntity, (a) => a.message) attachments: MessageAttachmentEntity[];
}

@Entity('message_attachments')
export class MessageAttachmentEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'message_id' }) messageId: string;
  @Column({ name: 'file_url' }) fileUrl: string;
  @Column({ name: 'file_type' }) fileType: string;
  @Column({ name: 'file_size_kb', nullable: true }) fileSizeKb: number | null;
  @Column({ name: 'duration_seconds', type: 'smallint', nullable: true }) durationSeconds: number | null;
  @Column({ type: 'double precision', nullable: true }) latitude: number | null;
  @Column({ type: 'double precision', nullable: true }) longitude: number | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @ManyToOne(() => MessageEntity, (m) => m.attachments) @JoinColumn({ name: 'message_id' }) message: MessageEntity;
}
