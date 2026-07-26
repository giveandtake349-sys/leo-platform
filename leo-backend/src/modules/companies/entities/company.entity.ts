// company.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '../../auth/entities/user.entity';

@Entity('companies')
export class CompanyEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', unique: true }) userId: string;
  @Column({ name: 'company_name' }) companyName: string;
  @Column({ name: 'owner_name' }) ownerName: string;
  @Column({ name: 'logo_url', nullable: true }) logoUrl: string | null;
  @Column({ name: 'verification_status', type: 'enum', enum: ['unverified','pending','verified','rejected'], default: 'unverified' })
  verificationStatus: string;
  @Column({ nullable: true }) industry: string | null;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ nullable: true }) division: string | null;
  @Column({ nullable: true }) district: string | null;
  @Column({ nullable: true }) thana: string | null;
  @Column({ nullable: true }) village: string | null;
  @Column({ name: 'location_lat', type: 'double precision', nullable: true }) locationLat: number | null;
  @Column({ name: 'location_lng', type: 'double precision', nullable: true }) locationLng: number | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt: Date | null;
  @OneToOne(() => UserEntity, (u) => u.company) @JoinColumn({ name: 'user_id' }) user: UserEntity;
}
