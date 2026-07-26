import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CompanyEntity } from '../../companies/entities/company.entity';
import { CategoryEntity } from '../../categories/entities/category.entity';

@Entity('jobs')
export class JobEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'company_id' }) companyId: string;
  @Column({ name: 'category_id' }) categoryId: string;
  @Column() title: string;
  @Column({ type: 'text' }) description: string;
  @Column({ name: 'job_type', type: 'enum', enum: ['offline_short_contract','permanent','online_freelance'] }) jobType: string;
  @Column({ name: 'work_mode', type: 'enum', enum: ['offline','online','both'] }) workMode: string;
  @Column({ name: 'salary_min', type: 'numeric', precision: 12, scale: 2, nullable: true }) salaryMin: number | null;
  @Column({ name: 'salary_max', type: 'numeric', precision: 12, scale: 2, nullable: true }) salaryMax: number | null;
  @Column({ name: 'salary_currency', default: 'BDT' }) salaryCurrency: string;
  @Column({ name: 'salary_period', nullable: true }) salaryPeriod: string | null;
  @Column({ nullable: true }) division: string | null;
  @Column({ nullable: true }) district: string | null;
  @Column({ nullable: true }) thana: string | null;
  @Column({ nullable: true }) village: string | null;
  @Column({ name: 'location_lat', type: 'double precision', nullable: true }) locationLat: number | null;
  @Column({ name: 'location_lng', type: 'double precision', nullable: true }) locationLng: number | null;
  @Column({ name: 'is_premium', default: false }) isPremium: boolean;
  @Column({ name: 'premium_boosted_at', type: 'timestamptz', nullable: true }) premiumBoostedAt: Date | null;
  @Column({ type: 'enum', enum: ['active','archived','closed','expired'], default: 'active' }) status: string;
  @Column({ name: 'view_count', default: 0 }) viewCount: number;
  @Column({ name: 'applicant_count', default: 0 }) applicantCount: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @ManyToOne(() => CompanyEntity) @JoinColumn({ name: 'company_id' }) company: CompanyEntity;
  @ManyToOne(() => CategoryEntity) @JoinColumn({ name: 'category_id' }) category: CategoryEntity;
}

@Entity('applications')
export class ApplicationEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'job_id' }) jobId: string;
  @Column({ name: 'worker_id' }) workerId: string;
  @Column({ type: 'enum', enum: ['applied','shortlisted','rejected','hired','withdrawn'], default: 'applied' }) status: string;
  @Column({ name: 'cover_note', type: 'text', nullable: true }) coverNote: string | null;
  @Column({ name: 'applied_at', type: 'timestamptz', default: () => 'NOW()' }) appliedAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt: Date | null;
}

@Entity('interests')
export class InterestEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'company_id' }) companyId: string;
  @Column({ name: 'worker_id' }) workerId: string;
  @Column({ name: 'job_id', nullable: true }) jobId: string | null;
  @Column({ type: 'enum', enum: ['sent','seen','accepted','declined'], default: 'sent' }) status: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity('saved_items')
export class SavedItemEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ name: 'saveable_type', type: 'enum', enum: ['job','worker'] }) saveableType: string;
  @Column({ name: 'saveable_id', type: 'uuid' }) saveableId: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}

@Entity('blocked_users')
export class BlockedUserEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'blocker_user_id' }) blockerUserId: string;
  @Column({ name: 'blocked_user_id' }) blockedUserId: string;
  @Column({ nullable: true }) reason: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
