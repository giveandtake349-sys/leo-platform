import { Controller, Get, Post, Patch, Param, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/create-company.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly svc: CompaniesService) {}

  @Roles('employer')
  @Post()
  create(@CurrentUser() u: JwtPayload, @Body() dto: CreateCompanyDto) {
    return this.svc.create(u.sub, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Roles('employer')
  @Patch('me')
  update(@CurrentUser() u: JwtPayload, @Body() dto: UpdateCompanyDto) {
    return this.svc.update(u.sub, dto);
  }

  @Roles('employer')
  @Post('me/logo')
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(@CurrentUser() u: JwtPayload, @UploadedFile() file: Express.Multer.File) {
    const logoUrl = `https://cdn.leo.app/logos/${u.sub}-${Date.now()}.jpg`;
    return this.svc.updateLogo(u.sub, logoUrl);
  }
}
