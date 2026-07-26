import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { EscrowService, CreateEscrowDto, OpenDisputeDto } from './escrow.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('escrow')
export class EscrowController {
  constructor(private readonly svc: EscrowService) {}

  @Roles('employer')
  @UseGuards(RolesGuard)
  @Post()
  create(@CurrentUser() u: JwtPayload, @Body() dto: CreateEscrowDto) {
    return this.svc.create(u.sub, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Get(':id/transitions')
  getTransitions(@Param('id') id: string) {
    return this.svc.getTransitions(id);
  }

  @Roles('employer')
  @UseGuards(RolesGuard)
  @Patch(':id/release')
  release(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.svc.release(id, u.sub);
  }

  @Patch(':id/refund')
  refund(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.svc.refund(id, u.sub);
  }

  @Post(':id/dispute')
  openDispute(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body() dto: OpenDisputeDto,
  ) {
    return this.svc.openDispute(id, u.sub, dto);
  }
}
