import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EscrowEntity, EscrowTransitionEntity } from './entities/escrow.entity';
import { EscrowService } from './escrow.service';
import { EscrowController } from './escrow.controller';
import { DisputeEntity } from '../reviews/entities/dispute.entity';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EscrowEntity, EscrowTransitionEntity, DisputeEntity]),
    AuthModule,
    WalletModule,
    NotificationsModule,
  ],
  providers: [EscrowService],
  controllers: [EscrowController],
  exports: [EscrowService],
})
export class EscrowModule {}
