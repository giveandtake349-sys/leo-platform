import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycVerificationEntity } from './entities/kyc-verification.entity';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([KycVerificationEntity]), AuthModule],
  providers: [KycService],
  controllers: [KycController],
  exports: [KycService],
})
export class KycModule {}
