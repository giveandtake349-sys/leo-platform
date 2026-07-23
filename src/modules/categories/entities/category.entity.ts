// category.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('categories')
export class CategoryEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) name: string;
  @Column({ unique: true }) slug: string;
  @Column({ name: 'icon_url', nullable: true }) iconUrl: string | null;
  @Column({ name: 'sort_order', type: 'smallint', default: 0 }) sortOrder: number;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt: Date | null;
}
