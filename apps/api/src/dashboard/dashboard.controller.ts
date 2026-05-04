import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('stats')
  getStats(@Request() req, @Query('month') month?: string, @Query('year') year?: string) {
    const now = new Date();
    return this.svc.getStats(
      req.user.userId,
      month ? parseInt(month) : now.getMonth() + 1,
      year ? parseInt(year) : now.getFullYear(),
    );
  }

  @Get('history')
  getHistory(@Request() req, @Query('month') month?: string, @Query('year') year?: string) {
    const now = new Date();
    return this.svc.getPaymentHistory(
      req.user.userId,
      month ? parseInt(month) : now.getMonth() + 1,
      year ? parseInt(year) : now.getFullYear(),
    );
  }
}
