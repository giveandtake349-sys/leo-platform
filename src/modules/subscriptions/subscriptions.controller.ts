import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { IsEnum } from 'class-validator';

class SubscribeDto {
  @IsEnum(['worker_premium', 'employer_premium'])
  plan: 'worker_premium' | 'employer_premium';
}

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly svc: SubscriptionsService) {}

  @Post()
  subscribe(@CurrentUser() u: JwtPayload, @Body() dto: SubscribeDto) {
    return this.svc.subscribe(u.sub, dto.plan);
  }

  @Get('me')
  getActive(@CurrentUser() u: JwtPayload) {
    return this.svc.getActive(u.sub);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.svc.cancel(u.sub, id);
  }
}
