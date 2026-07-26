import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get('users')
  listUsers(@Query() q: { page?: number; limit?: number; role?: string; status?: string }) {
    return this.svc.listUsers(q);
  }

  @Patch('users/:id/suspend')
  suspend(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.svc.suspendUser(u.sub, id);
  }

  @Patch('users/:id/reinstate')
  reinstate(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.svc.reinstateUser(u.sub, id);
  }

  @Get('kyc/pending')
  pendingKyc(@Query() q: { page?: number; limit?: number }) {
    return this.svc.getPendingKyc(q);
  }

  @Patch('kyc/:id/approve')
  approveKyc(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.svc.approveKyc(u.sub, id);
  }

  @Patch('kyc/:id/reject')
  rejectKyc(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.svc.rejectKyc(u.sub, id, reason);
  }

  @Get('disputes')
  disputes(@Query() q: { page?: number; limit?: number }) {
    return this.svc.getDisputes(q);
  }

  @Patch('disputes/:id/resolve')
  resolveDispute(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body() body: { outcome: string; notes: string },
  ) {
    return this.svc.resolveDispute(u.sub, id, body.outcome, body.notes);
  }

  @Get('reports')
  reports(@Query() q: { page?: number; limit?: number }) {
    return this.svc.getReports(q);
  }

  @Get('withdrawals/pending')
  pendingWithdrawals(@Query() q: { page?: number; limit?: number }) {
    return this.svc.getPendingWithdrawals(q);
  }

  @Get('audit-logs')
  auditLogs(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.svc.getAuditLogs(entityType, entityId);
  }

  @Get('feature-flags')
  getFlags() {
    return this.svc.getFlags();
  }

  @Patch('feature-flags/:key')
  toggleFlag(@Param('key') key: string, @Body('isEnabled') isEnabled: boolean) {
    return this.svc.toggleFlag(key, isEnabled);
  }
}
