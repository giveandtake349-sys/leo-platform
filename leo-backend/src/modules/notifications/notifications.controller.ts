import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get('me')
  list(@CurrentUser() u: JwtPayload, @Query() query: { page?: number; limit?: number }) {
    return this.svc.getMyNotifications(u.sub, query);
  }

  @Patch(':id/read')
  markOne(@CurrentUser() u: JwtPayload, @Param('id') id: string) {
    return this.svc.markRead(u.sub, id);
  }

  @Patch('read-all')
  markAll(@CurrentUser() u: JwtPayload) {
    return this.svc.markAllRead(u.sub);
  }
}
