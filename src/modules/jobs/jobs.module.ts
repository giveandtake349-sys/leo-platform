import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  JobEntity,
  ApplicationEntity,
  InterestEntity,
  SavedItemEntity,
  BlockedUserEntity,
} from './entities/job.entity';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { CompanyEntity } from '../companies/entities/company.entity';
import { WalletEntity } from '../wallet/entities/wallet.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobEntity,
      ApplicationEntity,
      InterestEntity,
      SavedItemEntity,
      BlockedUserEntity,
      CompanyEntity,
      WalletEntity,
    ]),
    AuthModule,
  ],
  providers: [JobsService],
  controllers: [JobsController],
  exports: [JobsService],
})
export class JobsModule {}
