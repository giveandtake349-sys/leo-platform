import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewEntity, ReportEntity, DisputeEntity } from './entities/dispute.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewEntity, ReportEntity, DisputeEntity]), AuthModule],
  providers: [ReviewsService],
  controllers: [ReviewsController],
  exports: [ReviewsService, TypeOrmModule],
})
export class ReviewsModule {}
