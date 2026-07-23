import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { KycService, SubmitKycDto } from './kyc.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly svc: KycService) {}

  @Post()
  submit(@CurrentUser() u: JwtPayload, @Body() dto: SubmitKycDto) {
    return this.svc.submit(u.sub, dto);
  }

  @Get('me')
  getStatus(@CurrentUser() u: JwtPayload) {
    return this.svc.getMyStatus(u.sub);
  }
}
