import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { BankAccountsService } from './bank-accounts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('bank-accounts')
export class BankAccountsController {
  constructor(private svc: BankAccountsService) {}

  @Get()
  find(@Request() req) {
    return this.svc.findByUser(req.user.userId);
  }

  @Post()
  upsert(@Request() req, @Body() body: { bankId: string; accountNo: string; accountName: string }) {
    return this.svc.upsert(req.user.userId, body);
  }
}
