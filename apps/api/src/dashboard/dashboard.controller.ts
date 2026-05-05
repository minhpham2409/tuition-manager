import { Controller, Get, Query, Res, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';

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

  @Get('tax-report')
  getTaxReport(
    @Query('quarter') quarter: string,
    @Query('year') year: string,
    @Request() req,
  ) {
    return this.svc.getTaxReport(req.user.userId, parseInt(quarter) || 1, parseInt(year) || new Date().getFullYear());
  }

  @Get('tax-report/export')
  async exportTaxReport(
    @Query('quarter') quarter: string,
    @Query('year') year: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const q = parseInt(quarter) || 1;
    const y = parseInt(year) || new Date().getFullYear();
    const report = await this.svc.getTaxReport(req.user.userId, q, y);
    if (report.isPreview) throw new ForbiddenException('Chưa đủ điều kiện xuất file: chưa hết quý');
    const buffer = await this.svc.exportTaxReportExcel(req.user.userId, q, y);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="bao-cao-thue-Q${q}-${y}.xlsx"`);
    res.send(buffer);
  }
}
