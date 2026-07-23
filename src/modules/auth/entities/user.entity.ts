import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { CompanyEntity } from '../../companies/entities/company.entity';
import { WorkerProfileEntity } from '../../workers/entities/worker-profile.entity';
import { WalletEntity } from '../../wallet/entities/wallet.entity';
import { SessionEntity } from './session.entity';
import { DeviceEntity } from './device.entity';

export type UserRole = 'employer' | 'worker';
export type UserStatus = 'active' | 'suspended' | 'deleted';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['employer', 'worker'] })
  role: UserRole;

  @Column({ name: 'phone_encrypted', type: 'text' })
  phoneEncrypted: string;

  @Column({ name: 'phone_hash', unique: true })
  phoneHash: string;

  @Column({ name: 'whatsapp_encrypted', type: 'text', nullable: true })
  whatsappEncrypted: string | null;

  @Column({ name: 'whatsapp_hash', nullable: true })
  whatsappHash: string | null;

  @Column({ name: 'is_phone_verified', default: false })
  isPhoneVerified: boolean;

  @Column({ name: 'is_whatsapp_verified', default: false })
  isWhatsappVerified: boolean;

  @Column({ type: 'enum', enum: ['active', 'suspended', 'deleted'], default: 'active' })
  status: UserStatus;

  @Column({ name: 'is_premium', default: false })
  isPremium: boolean;

  @Column({ name: 'premium_expires_at', type: 'timestamptz', nullable: true })
  premiumExpiresAt: Date | null;

  @Column({ name: 'preferred_language', default: 'bn' })
  preferredLanguage: string;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  // Relations
  @OneToOne(() => CompanyEntity, (c) => c.user)
  company: CompanyEntity;

  @OneToOne(() => WorkerProfileEntity, (w) => w.user)
  workerProfile: WorkerProfileEntity;

  @OneToOne(() => WalletEntity, (w) => w.user)
  wallet: WalletEntity;

  @OneToMany(() => SessionEntity, (s) => s.user)
  sessions: SessionEntity[];

  @OneToMany(() => DeviceEntity, (d) => d.user)
  devices: DeviceEntity[];
}
