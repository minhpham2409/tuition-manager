import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateInvoicesDto, UpdateInvoiceDto } from './dto';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string, filters: { month?: number; year?: number; classId?: string; status?: string }) {
    return this.prisma.invoice.findMany({
      where: {
        student: { class: { userId, ...(filters.classId ? { id: filters.classId } : {}) } },
        ...(filters.month ? { month: filters.month } : {}),
        ...(filters.year ? { year: filters.year } : {}),
        ...(filters.status ? { status: filters.status as InvoiceStatus } : {}),
      },
      include: {
        student: { include: { class: { select: { name: true } } } },
      },
      orderBy: [{ status: 'asc' }, { student: { name: 'asc' } }],
    });
  }

  async generate(dto: GenerateInvoicesDto) {
    const cls = await this.prisma.class.findUnique({
      where: { id: dto.classId },
      include: { students: true },
    });
    if (!cls) return { created: 0 };

    let created = 0;
    for (const student of cls.students) {
      try {
        await this.prisma.invoice.create({
          data: {
            studentId: student.id,
            month: dto.month,
            year: dto.year,
            amount: cls.tuitionFee,
          },
        });
        created++;
      } catch (e) {
        // unique constraint violation = invoice already exists, skip
      }
    }
    return { created, total: cls.students.length };
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const data: any = { ...dto };
    if (dto.status === 'PAID') data.paidAt = new Date();
    if (dto.status === 'UNPAID') data.paidAt = null;
    return this.prisma.invoice.update({ where: { id }, data });
  }

  async getQrData(id: string, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { student: true },
    });
    if (!invoice) return null;

    const bank = await this.prisma.bankAccount.findFirst({
      where: { userId, isDefault: true },
    });
    if (!bank) return { error: 'Chưa cài đặt tài khoản ngân hàng' };

    const description = `HP T${invoice.month} ${invoice.student.name}`.substring(0, 50);
    const qrUrl = `https://img.vietqr.io/image/${bank.bankId}-${bank.accountNo}-compact2.png?amount=${invoice.amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(bank.accountName)}`;

    return {
      qrUrl,
      bankId: bank.bankId,
      accountNo: bank.accountNo,
      accountName: bank.accountName,
      amount: invoice.amount,
      description,
      studentName: invoice.student.name,
      month: invoice.month,
      year: invoice.year,
    };
  }
}
