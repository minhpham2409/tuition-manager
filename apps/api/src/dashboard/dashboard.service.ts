import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string, month: number, year: number) {
    const classes = await this.prisma.class.count({ where: { userId } });
    const students = await this.prisma.student.count({ where: { class: { userId } } });

    const invoices = await this.prisma.invoice.findMany({
      where: { month, year, student: { class: { userId } } },
    });

    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paidAmount = invoices.filter(i => i.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0);
    const unpaidCount = invoices.filter(i => i.status === 'UNPAID').length;
    const paidCount = invoices.filter(i => i.status === 'PAID').length;

    // Revenue last 6 months
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      let m = month - i;
      let y = year;
      if (m <= 0) { m += 12; y -= 1; }
      const monthInvoices = await this.prisma.invoice.findMany({
        where: { month: m, year: y, status: 'PAID', student: { class: { userId } } },
      });
      revenueByMonth.push({
        month: m,
        year: y,
        label: `T${m}/${y}`,
        revenue: monthInvoices.reduce((sum, inv) => sum + inv.amount, 0),
      });
    }

    // Unpaid students this month
    const unpaidStudents = await this.prisma.invoice.findMany({
      where: { month, year, status: 'UNPAID', student: { class: { userId } } },
      include: { student: { include: { class: { select: { name: true } } } } },
      take: 10,
    });

    return {
      classes,
      students,
      totalAmount,
      paidAmount,
      unpaidAmount: totalAmount - paidAmount,
      paidCount,
      unpaidCount,
      revenueByMonth,
      unpaidStudents,
    };
  }

  async getPaymentHistory(userId: string, month: number, year: number) {
    const invoices = await this.prisma.invoice.findMany({
      where: { month, year, student: { class: { userId } } },
      include: {
        student: { include: { class: { select: { name: true } } } },
        transactions: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });

    const total = invoices.length;
    const paid = invoices.filter(i => i.status === 'PAID');
    const unpaid = invoices.filter(i => i.status !== 'PAID');
    const totalAmount = invoices.reduce((s, i) => s + i.amount, 0);
    const paidAmount = paid.reduce((s, i) => s + i.amount, 0);

    // Timeline: all payment events this month
    const events = [];
    for (const inv of paid) {
      events.push({
        type: inv.note?.startsWith('Auto:') ? 'auto' : 'manual',
        studentName: inv.student.name,
        className: inv.student.class.name,
        amount: inv.amount,
        date: inv.paidAt || inv.updatedAt,
        note: inv.note,
      });
    }
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      month,
      year,
      summary: { total, paidCount: paid.length, unpaidCount: unpaid.length, totalAmount, paidAmount, unpaidAmount: totalAmount - paidAmount },
      invoices: invoices.map(inv => ({
        id: inv.id,
        studentName: inv.student.name,
        parentName: (inv.student as any).parentName,
        className: inv.student.class.name,
        amount: inv.amount,
        status: inv.status,
        paidAt: inv.paidAt,
        note: inv.note,
        transactions: inv.transactions.map(tx => ({
          id: tx.id,
          amount: tx.amount,
          content: tx.content,
          gateway: tx.gateway,
          matched: tx.matched,
          date: tx.transactionDate,
        })),
      })),
      timeline: events,
    };
  }
}
