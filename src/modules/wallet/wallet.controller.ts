import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { WalletService, WithdrawDto } from './wallet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly svc: WalletService) {}

  @Get('me')
  getWallet(@CurrentUser() u: JwtPayload) {
    return this.svc.getWallet(u.sub);
  }

  @Get('me/transactions')
  getTransactions(
    @CurrentUser() u: JwtPayload,
    @Query() query: { page?: number; limit?: number },
  ) {
    return this.svc.getTransactions(u.sub, query);
  }

  @Post('withdrawals')
  requestWithdrawal(@CurrentUser() u: JwtPayload, @Body() dto: WithdrawDto) {
    return this.svc.requestWithdrawal(u.sub, dto);
  }

  @Get('withdrawals/me')
  myWithdrawals(
    @CurrentUser() u: JwtPayload,
    @Query() query: { page?: number; limit?: number },
  ) {
    return this.svc.getMyWithdrawals(u.sub, query);
  }
}
