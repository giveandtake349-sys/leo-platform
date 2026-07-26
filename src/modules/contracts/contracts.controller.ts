import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ContractsService, CreateContractDto, CreateMilestoneDto } from './contracts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly svc: ContractsService) {}

  @Roles('employer')
  @UseGuards(RolesGuard)
  @Post()
  create(@CurrentUser() u: JwtPayload, @Body() dto: CreateContractDto) {
    return this.svc.create(u.sub, dto);
  }

  @Get('me')
  myContracts(@CurrentUser() u: JwtPayload) {
    return this.svc.findMyContracts(u.sub);
  }

  @Get(':id')
  findOne(@Param('id') _id: string) {
    return this.svc.findById(_id);
  }

  @Post(':id/commission/pay')
  payFee(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body('role') role: 'employer' | 'worker',
  ) {
    return this.svc.recordFeePaid(id, u.sub, role);
  }

  @Roles('employer')
  @UseGuards(RolesGuard)
  @Post(':id/milestones')
  addMilestone(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.svc.addMilestone(u.sub, id, dto);
  }

  @Roles('worker')
  @UseGuards(RolesGuard)
  @Patch('milestones/:mid/submit')
  submitMilestone(@CurrentUser() u: JwtPayload, @Param('mid') mid: string) {
    return this.svc.submitMilestone(u.sub, mid);
  }

  @Roles('employer')
  @UseGuards(RolesGuard)
  @Patch('milestones/:mid/approve')
  approveMilestone(@CurrentUser() u: JwtPayload, @Param('mid') mid: string) {
    return this.svc.approveMilestone(u.sub, mid);
  }

  @Roles('employer')
  @UseGuards(RolesGuard)
  @Patch('milestones/:mid/request-revision')
  requestRevision(@CurrentUser() u: JwtPayload, @Param('mid') mid: string) {
    return this.svc.requestRevision(u.sub, mid);
  }
}
