import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BankAccountsService {
  constructor(private prisma: PrismaService) {}

  findByUser(userId: string) {
    return this.prisma.bankAccount.findFirst({ where: { userId, isDefault: true } });
  }

  async upsert(userId: string, data: { bankId: string; accountNo: string; accountName: string }) {
    const existing = await this.prisma.bankAccount.findFirst({ where: { userId } });
    if (existing) {
      return this.prisma.bankAccount.update({ where: { id: existing.id }, data });
    }
    return this.prisma.bankAccount.create({ data: { ...data, userId, isDefault: true } });
  }
}
