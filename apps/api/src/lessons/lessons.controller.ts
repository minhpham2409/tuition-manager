import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private svc: LessonsService) {}

  @Get('report')
  getReport(@Query('classId') classId: string, @Query('month') month: string, @Query('year') year: string) {
    return this.svc.getReport(classId, parseInt(month), parseInt(year));
  }

  @Get()
  findByMonth(@Query('classId') classId: string, @Query('month') month: string, @Query('year') year: string) {
    return this.svc.findByMonth(classId, parseInt(month), parseInt(year));
  }

  @Post('generate-schedule')
  generateFromSchedule(@Body() body: { classId: string; month: number; year: number }) {
    return this.svc.generateFromSchedule(body.classId, body.month, body.year);
  }

  @Post()
  create(@Body() body: { classId: string; date: string }) {
    return this.svc.create(body.classId, body.date);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { taught?: boolean; note?: string }) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Post(':id/attendance')
  saveAttendance(@Param('id') id: string, @Body() body: { records: { studentId: string; present: boolean; note?: string }[] }) {
    return this.svc.saveAttendance(id, body.records);
  }

  @Post('generate-invoices')
  generateInvoices(@Body() body: { classId: string; month: number; year: number }) {
    return this.svc.generateInvoices(body.classId, body.month, body.year);
  }

  @Get('export-attendance')
  async exportAttendance(
    @Query('classId') classId: string,
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const buffer = await this.svc.exportAttendanceExcel(classId, parseInt(month), parseInt(year));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="diem-danh-T${month}-${year}.xlsx"`);
    res.send(buffer);
  }
}

