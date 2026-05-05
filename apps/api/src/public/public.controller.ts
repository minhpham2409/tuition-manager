import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Public endpoint - no JWT required
// Parents can view this page to see payment QR
@Controller('public')
export class PublicController {
  constructor(private prisma: PrismaService) {}

  @Get('invoice/:id')
  async getPublicInvoice(@Param('id') id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        student: { include: { class: { include: { user: true } } } },
      },
    });
    if (!invoice) throw new NotFoundException();

    const bank = await this.prisma.bankAccount.findFirst({
      where: { userId: invoice.student.class.userId, isDefault: true },
    });

    const description = `HP T${invoice.month} ${invoice.student.name}`.substring(0, 50);
    const qrUrl = bank
      ? `https://img.vietqr.io/image/${bank.bankId}-${bank.accountNo}-compact2.png?amount=${invoice.amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(bank.accountName)}`
      : null;

    return {
      id: invoice.id,
      studentName: invoice.student.name,
      parentName: invoice.student.parentName,
      parentPhone: invoice.student.parentPhone,
      className: invoice.student.class.name,
      teacherName: invoice.student.class.user.name,
      month: invoice.month,
      year: invoice.year,
      amount: invoice.amount,
      status: invoice.status,
      paidAt: invoice.paidAt,
      qrUrl,
      bank: bank ? { bankId: bank.bankId, accountNo: bank.accountNo, accountName: bank.accountName } : null,
      description,
    };
  }

  @Get('portal/:id')
  async getPublicPortal(@Param('id') id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        class: { include: { user: { select: { name: true, email: true } } } },
        invoices: { orderBy: [{ year: 'desc' }, { month: 'desc' }] },
        attendances: {
          include: { lesson: true },
          orderBy: { lesson: { date: 'desc' } },
        },
      },
    });

    if (!student) throw new NotFoundException('Học sinh không tồn tại');

    return {
      id: student.id,
      name: student.name,
      parentName: student.parentName,
      className: student.class.name,
      teacherName: student.class.user.name,
      invoices: student.invoices,
      attendances: student.attendances.map(a => ({
        date: a.lesson.date,
        present: a.present,
        note: a.note,
        taught: a.lesson.taught,
      })),
    };
  }
}
