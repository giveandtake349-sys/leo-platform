import {
  Controller, Get, Patch, Delete, Body,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { UsersService, UpdateUserDto } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.findById(user.sub);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user.sub, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.softDelete(user.sub);
  }
}
