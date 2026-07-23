import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdminUserEntity,
  RoleEntity,
  AuditLogEntity,
  FeatureFlagEntity,
} from './entities/admin-user.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UserEntity } from '../auth/entities/user.entity';
import { KycVerificationEntity } from '../kyc/entities/kyc-verification.entity';
import { ReportEntity, DisputeEntity } from '../reviews/entities/dispute.entity';
import { WithdrawalEntity } from '../wallet/entities/wallet.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminUserEntity,
      RoleEntity,
      AuditLogEntity,
      FeatureFlagEntity,
      UserEntity,
      KycVerificationEntity,
      ReportEntity,
      DisputeEntity,
      WithdrawalEntity,
    ]),
    AuthModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
