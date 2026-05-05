import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
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

    // Generate numeric-only payment code from UUID (SePay requires 'Số nguyên')
    const numericId = invoice.id.replace(/[^0-9]/g, '').substring(0, 8).padEnd(8, '0');
    const paymentCode = `HP${numericId}`;
    const qrUrl = bank
      ? `https://img.vietqr.io/image/${bank.bankId}-${bank.accountNo}-compact2.png?amount=${invoice.amount}&addInfo=${paymentCode}&accountName=${encodeURIComponent(bank.accountName)}`
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
      description: paymentCode,
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

  @Post('sepay-webhook')
  async handleSepayWebhook(@Body() body: any) {
    // SePay sends data in body.data for transactions, or body directly depending on config
    const transactions = body.data ? (Array.isArray(body.data) ? body.data : [body.data]) : (Array.isArray(body) ? body : [body]);
    
    for (const tx of transactions) {
      if (tx.transferType !== 'in') continue; // Only care about incoming money
      
      const content = (tx.content || '').toUpperCase();
      
      // Match HP + 3-10 digits (matching SePay's payment code format)
      const match = content.match(/HP(\d{3,10})/);
      if (!match) continue;

      const numericId = match[1];

      // Find invoice where numeric portion of ID matches
      const allInvoices = await this.prisma.invoice.findMany({
        where: { status: 'UNPAID' }
      });
      
      const invoice = allInvoices.find(inv => {
        const invNumericId = inv.id.replace(/[^0-9]/g, '').substring(0, 8).padEnd(8, '0');
        return invNumericId === numericId;
      });

      if (invoice) {
        // If money received is >= invoice amount, mark as PAID
        if (tx.transferAmount >= invoice.amount) {
          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'PAID', paidAt: new Date(tx.transactionDate || new Date()) }
          });
        }
      }
    }
    
    return { success: true };
  }
}
