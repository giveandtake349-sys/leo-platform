import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';
import { SkillEntity } from '../../categories/entities/skill.entity';

@Entity('worker_profiles')
export class WorkerProfileEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', unique: true }) userId: string;
  @Column({ name: 'full_name' }) fullName: string;
  @Column({ name: 'photo_url', nullable: true }) photoUrl: string | null;
  @Column({ type: 'text', nullable: true }) bio: string | null;
  @Column({ name: 'experience_years', type: 'numeric', precision: 4, scale: 1, nullable: true }) experienceYears: number | null;
  @Column({ nullable: true }) education: string | null;
  @Column({ type: 'simple-array', nullable: true }) languages: string[] | null;
  @Column({ name: 'availability_mode', type: 'enum', enum: ['offline','online','both'], default: 'both' }) availabilityMode: string;
  @Column({ name: 'open_to_work', default: true }) openToWork: boolean;
  @Column({ name: 'trust_badge', type: 'enum', enum: ['none','blue_tick'], default: 'none' }) trustBadge: string;
  @Column({ name: 'profile_strength', type: 'smallint', default: 0 }) profileStrength: number;
  @Column({ nullable: true }) division: string | null;
  @Column({ nullable: true }) district: string | null;
  @Column({ nullable: true }) thana: string | null;
  @Column({ nullable: true }) village: string | null;
  @Column({ name: 'location_lat', type: 'double precision', nullable: true }) locationLat: number | null;
  @Column({ name: 'location_lng', type: 'double precision', nullable: true }) locationLng: number | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @OneToOne(() => UserEntity, (u) => u.workerProfile) @JoinColumn({ name: 'user_id' }) user: UserEntity;
}

@Entity('worker_skills')
export class WorkerSkillEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'worker_id' }) workerId: string;
  @Column({ name: 'skill_id' }) skillId: string;
  @Column({ name: 'years_experience', type: 'numeric', precision: 4, scale: 1, nullable: true }) yearsExperience: number | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @ManyToOne(() => WorkerProfileEntity) @JoinColumn({ name: 'worker_id' }) worker: WorkerProfileEntity;
  @ManyToOne(() => SkillEntity) @JoinColumn({ name: 'skill_id' }) skill: SkillEntity;
}

@Entity('worker_portfolios')
export class WorkerPortfolioEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'worker_id' }) workerId: string;
  @Column() title: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ name: 'file_url' }) fileUrl: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt: Date | null;
}

@Entity('worker_certificates')
export class WorkerCertificateEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'worker_id' }) workerId: string;
  @Column() title: string;
  @Column({ nullable: true }) issuer: string | null;
  @Column({ name: 'file_url' }) fileUrl: string;
  @Column({ name: 'issued_at', type: 'date', nullable: true }) issuedAt: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt: Date | null;
}
