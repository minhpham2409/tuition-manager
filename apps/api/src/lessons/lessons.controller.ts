import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private svc: LessonsService) {}

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
}
