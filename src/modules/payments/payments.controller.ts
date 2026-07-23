import {
  Controller, Post, Get, Param, Body, Req, Headers,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService, InitiatePaymentDto } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransactionEntity } from './entities/payment-transaction.entity';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly svc: PaymentsService,
    @InjectRepository(PaymentTransactionEntity)
    private txRepo: Repository<PaymentTransactionEntity>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  initiate(@CurrentUser() u: JwtPayload, @Body() dto: InitiatePaymentDto) {
    return this.svc.initiate(u.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.txRepo.findOne({ where: { id } });
  }

  @Public()
  @Post('webhooks/bkash')
  @HttpCode(HttpStatus.OK)
  async bkashWebhook(
    @Headers('x-bkash-signature') sig: string,
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ) {
    const raw = (req as any).rawBody?.toString() ?? JSON.stringify(body);
    await this.svc.handleWebhook('bkash', raw, sig, body);
    return { received: true };
  }

  @Public()
  @Post('webhooks/nagad')
  @HttpCode(HttpStatus.OK)
  async nagadWebhook(
    @Headers('x-nagad-signature') sig: string,
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ) {
    const raw = (req as any).rawBody?.toString() ?? JSON.stringify(body);
    await this.svc.handleWebhook('nagad', raw, sig, body);
    return { received: true };
  }

  @Public()
  @Post('webhooks/sslcommerz')
  @HttpCode(HttpStatus.OK)
  async sslcommerzWebhook(
    @Headers('verify_sign') sig: string,
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ) {
    const raw = (req as any).rawBody?.toString() ?? JSON.stringify(body);
    await this.svc.handleWebhook('sslcommerz', raw, sig, body);
    return { received: true };
  }
}
