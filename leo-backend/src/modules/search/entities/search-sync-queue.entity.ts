// search-sync-queue.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('search_sync_queue')
export class SearchSyncQueueEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'entity_type' }) entityType: string;
  @Column({ name: 'entity_id', type: 'uuid' }) entityId: string;
  @Column() operation: string; // 'index' | 'delete'
  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true }) processedAt: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
