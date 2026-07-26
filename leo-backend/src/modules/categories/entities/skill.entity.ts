import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CategoryEntity } from './category.entity';

@Entity('skills')
export class SkillEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'category_id' }) categoryId: string;
  @Column() name: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @ManyToOne(() => CategoryEntity) @JoinColumn({ name: 'category_id' }) category: CategoryEntity;
}
