import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { GenerateInvoicesDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private svc: InvoicesService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('classId') classId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.findAll(req.user.userId, {
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
      classId,
      status,
    });
  }

  @Post('generate')
  generate(@Body() dto: GenerateInvoicesDto) {
    return this.svc.generate(dto);
  }

  @Get(':id/qr')
  getQr(@Param('id') id: string, @Request() req) {
    return this.svc.getQrData(id, req.user.userId);
  }
}

