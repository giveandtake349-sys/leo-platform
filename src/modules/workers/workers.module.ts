import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  WorkerProfileEntity,
  WorkerSkillEntity,
  WorkerPortfolioEntity,
  WorkerCertificateEntity,
} from './entities/worker-profile.entity';
import { WorkersService } from './workers.service';
import { WorkersController } from './workers.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkerProfileEntity,
      WorkerSkillEntity,
      WorkerPortfolioEntity,
      WorkerCertificateEntity,
    ]),
    AuthModule,
  ],
  providers: [WorkersService],
  controllers: [WorkersController],
  exports: [WorkersService],
})
export class WorkersModule {}
