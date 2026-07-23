import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Delete,
} from '@nestjs/common';
import { WorkersService, CreateWorkerProfileDto, ToggleOpenToWorkDto } from './workers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Controller('workers')
export class WorkersController {
  constructor(private readonly svc: WorkersService) {}

  @Roles('worker')
  @UseGuards(RolesGuard)
  @Post()
  create(@CurrentUser() u: JwtPayload, @Body() dto: CreateWorkerProfileDto) {
    return this.svc.create(u.sub, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Roles('worker')
  @UseGuards(RolesGuard)
  @Patch('me')
  update(@CurrentUser() u: JwtPayload, @Body() dto: Partial<CreateWorkerProfileDto>) {
    return this.svc.update(u.sub, dto);
  }

  @Roles('worker')
  @UseGuards(RolesGuard)
  @Patch('me/open-to-work')
  toggleAvailability(@CurrentUser() u: JwtPayload, @Body() dto: ToggleOpenToWorkDto) {
    return this.svc.toggleOpenToWork(u.sub, dto);
  }

  @Roles('worker')
  @UseGuards(RolesGuard)
  @Post('me/skills')
  addSkill(
    @CurrentUser() u: JwtPayload,
    @Body() body: { skillId: string; yearsExperience?: number },
  ) {
    return this.svc.addSkill(u.sub, body.skillId, body.yearsExperience);
  }

  @Roles('worker')
  @UseGuards(RolesGuard)
  @Delete('me/skills/:skillId')
  removeSkill(@CurrentUser() u: JwtPayload, @Param('skillId') skillId: string) {
    return this.svc.removeSkill(u.sub, skillId);
  }
}
