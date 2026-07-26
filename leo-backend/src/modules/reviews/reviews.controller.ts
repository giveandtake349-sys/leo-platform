import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ReviewsService, CreateReviewDto, CreateReportDto } from './reviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/roles.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly svc: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() u: JwtPayload, @Body() dto: CreateReviewDto) {
    return this.svc.createReview(u.sub, dto);
  }

  @Public()
  @Get('user/:userId')
  getUserReviews(@Param('userId') userId: string) {
    return this.svc.getUserReviews(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reports')
  createReport(@CurrentUser() u: JwtPayload, @Body() dto: CreateReportDto) {
    return this.svc.createReport(u.sub, dto);
  }
}
