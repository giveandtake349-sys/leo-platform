import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { JobsService, CreateJobDto, FilterJobsDto } from './jobs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles, Public } from '../../common/decorators/roles.decorator';
import { IsOptional, IsString } from 'class-validator';

class ApplyDto {
  @IsOptional()
  @IsString()
  coverNote?: string;
}

@Controller('jobs')
export class JobsController {
  constructor(private readonly svc: JobsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Post()
  create(@CurrentUser() u: JwtPayload, @Body() dto: CreateJobDto) {
    return this.svc.create(u.sub, dto);
  }

  @Public()
  @Get()
  feed(@Query() dto: FilterJobsDto) {
    return this.svc.findFeed(dto);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Post(':id/boost')
  boost(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.svc.boostJob(u.sub, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('worker')
  @Post(':id/apply')
  apply(
    @CurrentUser() u: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ApplyDto,
  ) {
    return this.svc.applyToJob(u.sub, id, dto.coverNote);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Get(':id/applicants')
  applicants(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.svc.getApplicants(u.sub, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Patch('applications/:appId')
  updateApplication(
    @CurrentUser() u: JwtPayload,
    @Param('appId') appId: string,
    @Body('status') status: string,
  ) {
    return this.svc.updateApplicationStatus(u.sub, appId, status);
  }
}
