// admin-user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('admin_users')
export class AdminUserEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'full_name' }) fullName: string;
  @Column({ unique: true }) email: string;
  @Column({ name: 'password_hash' }) passwordHash: string;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true }) lastLoginAt: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt: Date | null;
}

@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) name: string;
  @Column({ nullable: true }) description: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'actor_id', nullable: true }) actorId: string | null;
  @Column({ name: 'actor_type', type: 'enum', enum: ['user','admin','system'] }) actorType: string;
  @Column() action: string;
  @Column({ name: 'entity_type' }) entityType: string;
  @Column({ name: 'entity_id', type: 'uuid', nullable: true }) entityId: string | null;
  @Column({ name: 'before_state', type: 'jsonb', nullable: true }) beforeState: Record<string, unknown> | null;
  @Column({ name: 'after_state', type: 'jsonb', nullable: true }) afterState: Record<string, unknown> | null;
  @Column({ name: 'ip_address', nullable: true }) ipAddress: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}

@Entity('feature_flags')
export class FeatureFlagEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) key: string;
  @Column({ name: 'is_enabled', default: false }) isEnabled: boolean;
  @Column({ nullable: true }) description: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
