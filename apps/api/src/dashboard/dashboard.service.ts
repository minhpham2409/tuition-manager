import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string, month: number, year: number) {
    const classes = await this.prisma.class.count({ where: { userId } });
    const students = await this.prisma.student.count({ where: { class: { userId } } });

    const invoices = await this.prisma.invoice.findMany({
      where: { month, year, student: { class: { userId } } },
      include: { student: { include: { class: { select: { name: true, pricePerLesson: true } } } } },
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
        month: m, year: y, label: `T${m}/${y}`,
        revenue: monthInvoices.reduce((sum, inv) => sum + inv.amount, 0),
      });
    }

    // Unpaid students this month
    const unpaidStudents = await this.prisma.invoice.findMany({
      where: { month, year, status: 'UNPAID', student: { class: { userId } } },
      include: { student: { include: { class: { select: { name: true } } } } },
      take: 20,
    });

    // Per-class breakdown
    const classBreakdown = [];
    const userClasses = await this.prisma.class.findMany({
      where: { userId },
      include: { _count: { select: { students: true } } },
    });
    for (const cls of userClasses) {
      const clsInvoices = invoices.filter(inv => inv.student.class.name === cls.name);
      const clsPaid = clsInvoices.filter(i => i.status === 'PAID');
      classBreakdown.push({
        name: cls.name,
        studentCount: cls._count.students,
        pricePerLesson: cls.pricePerLesson,
        totalInvoices: clsInvoices.length,
        paidCount: clsPaid.length,
        unpaidCount: clsInvoices.length - clsPaid.length,
        totalAmount: clsInvoices.reduce((s, i) => s + i.amount, 0),
        paidAmount: clsPaid.reduce((s, i) => s + i.amount, 0),
      });
    }

    // Lessons this month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const totalLessons = await this.prisma.lesson.count({
      where: { class: { userId }, date: { gte: startDate, lte: endDate } },
    });
    const taughtLessons = await this.prisma.lesson.count({
      where: { class: { userId }, date: { gte: startDate, lte: endDate }, taught: true },
    });

    // Overdue reminders: unpaid invoices older than 7 days
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: { status: 'UNPAID', student: { class: { userId } } },
      include: { student: { include: { class: { select: { name: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    const now = new Date();
    const overdueList = overdueInvoices.map(inv => {
      const daysOld = Math.floor((now.getTime() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: inv.id,
        studentName: inv.student.name,
        parentName: (inv.student as any).parentName,
        parentPhone: (inv.student as any).parentPhone,
        className: inv.student.class.name,
        month: inv.month,
        year: inv.year,
        amount: inv.amount,
        daysOld,
      };
    }).filter(inv => inv.daysOld >= 7)
      .sort((a, b) => b.daysOld - a.daysOld);

    return {
      classes, students, totalAmount, paidAmount,
      unpaidAmount: totalAmount - paidAmount,
      paidCount, unpaidCount,
      revenueByMonth, unpaidStudents,
      classBreakdown,
      totalLessons, taughtLessons,
      collectionRate: invoices.length > 0 ? Math.round((paidCount / invoices.length) * 100) : 0,
      overdueList,
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
      month, year,
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
          id: tx.id, amount: tx.amount, content: tx.content,
          gateway: tx.gateway, matched: tx.matched, date: tx.transactionDate,
        })),
      })),
      timeline: events,
    };
  }

  async getTaxReport(userId: string, quarter: number, year: number) {
    const months = [((quarter - 1) * 3) + 1, ((quarter - 1) * 3) + 2, ((quarter - 1) * 3) + 3];
    const classes = await this.prisma.class.findMany({ where: { userId } });

    const rows = [];
    const monthTotals = [0, 0, 0];
    let grandTotal = 0;

    for (const cls of classes) {
      const monthAmounts = [];
      let rowTotal = 0;
      for (let i = 0; i < 3; i++) {
        const m = months[i];
        const invs = await this.prisma.invoice.findMany({
          where: { month: m, year, status: 'PAID', student: { classId: cls.id } },
        });
        const amount = invs.reduce((s, inv) => s + inv.amount, 0);
        monthAmounts.push(amount);
        monthTotals[i] += amount;
        rowTotal += amount;
      }
      grandTotal += rowTotal;
      rows.push({ className: cls.name, months: monthAmounts, total: rowTotal });
    }

    const now = new Date();
    const isMonthComplete = (m: number) => {
      const lastDay = new Date(year, m, 0);
      return now > lastDay;
    };

    return {
      quarter, year,
      months,
      rows,
      monthTotals,
      grandTotal,
      canExport: months.every(m => isMonthComplete(m)),
      isPreview: !months.every(m => isMonthComplete(m)),
    };
  }

  async exportTaxReportExcel(userId: string, quarter: number, year: number): Promise<Buffer> {
    const report = await this.getTaxReport(userId, quarter, year);
    const userName = (await this.prisma.user.findFirst({ where: { id: userId } }))?.name || '';

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Báo cáo thuế');

    // Title
    ws.mergeCells('A1:G1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `BÁO CÁO THUẾ QUÝ ${quarter} NĂM ${year} - HỘ KINH DOANH ${userName.toUpperCase()}`;
    titleCell.font = { bold: true, size: 13 };
    titleCell.alignment = { horizontal: 'center' };
    ws.addRow([]);

    // Headers
    const headerRow = ws.addRow(['STT', 'Lớp', `Tháng ${report.months[0]}`, `Tháng ${report.months[1]}`, `Tháng ${report.months[2]}`, 'Tổng']);
    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { horizontal: 'center' };
    });

    report.rows.forEach((row, i) => {
      const r = ws.addRow([i + 1, row.className, row.months[0], row.months[1], row.months[2], row.total]);
      r.eachCell((cell, colNumber) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (colNumber > 2) cell.numFmt = '#,##0';
      });
    });

    // Total row
    const totalRow = ws.addRow(['', 'Tổng', report.monthTotals[0], report.monthTotals[1], report.monthTotals[2], report.grandTotal]);
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      if (colNumber > 2) cell.numFmt = '#,##0';
    });

    ws.getColumn(2).width = 20;
    [3, 4, 5, 6].forEach(c => { ws.getColumn(c).width = 15; });

    return wb.xlsx.writeBuffer() as Promise<Buffer>;
  }

  // ─── Monthly tax report ─────────────────────────────────────────────────
  async getMonthlyTaxReport(userId: string, month: number, year: number) {
    const classes = await this.prisma.class.findMany({ where: { userId } });
    const rows = [];
    let grandTotal = 0;

    for (const cls of classes) {
      const invs = await this.prisma.invoice.findMany({
        where: { month, year, status: 'PAID', student: { classId: cls.id } },
      });
      const amount = invs.reduce((s, inv) => s + inv.amount, 0);
      grandTotal += amount;
      rows.push({ className: cls.name, amount, invoiceCount: invs.length });
    }

    const now = new Date();
    const lastDayOfMonth = new Date(year, month, 0);
    const isComplete = now > lastDayOfMonth;

    return { month, year, rows, grandTotal, isComplete, isPreview: !isComplete };
  }

  async exportMonthlyTaxReportExcel(userId: string, month: number, year: number): Promise<Buffer> {
    const report = await this.getMonthlyTaxReport(userId, month, year);
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    return this._buildMonthlyExcel(report, user?.name || '', month, year, false);
  }

  async generateTaxTemplate(userId: string, month: number, year: number): Promise<Buffer> {
    const classes = await this.prisma.class.findMany({ where: { userId } });
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    const rows = classes.map(c => ({ className: c.name, amount: 0, invoiceCount: 0 }));
    const mockReport = { month, year, rows, grandTotal: 0 };
    return this._buildMonthlyExcel(mockReport, user?.name || '', month, year, true);
  }

  private async _buildMonthlyExcel(report: any, userName: string, month: number, year: number, isTemplate = false): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Kê khai thuế');

    ws.mergeCells('A1:D1');
    const t1 = ws.getCell('A1');
    t1.value = `KÊ KHAI THUẾ THÁNG ${month}/${year}${isTemplate ? ' (FILE MẪU)' : ''}`;
    t1.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    t1.alignment = { horizontal: 'center', vertical: 'middle' };
    t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e3a5f' } };
    ws.getRow(1).height = 30;

    ws.mergeCells('A2:D2');
    const t2 = ws.getCell('A2');
    t2.value = `HỘ KINH DOANH: ${userName.toUpperCase()}`;
    t2.font = { bold: true, size: 11 };
    t2.alignment = { horizontal: 'center' };

    ws.addRow([]);

    if (isTemplate) {
      ws.mergeCells('A4:D4');
      const guide = ws.getCell('A4');
      guide.value = '⚠️ Hướng dẫn: Điền số tiền thu được vào ô vàng cột "Doanh thu" rồi upload lên hệ thống.';
      guide.font = { italic: true, color: { argb: 'FFCC6600' }, size: 10 };
      ws.addRow([]);
    }

    const headerRow = ws.addRow(['STT', 'Tên lớp', 'Doanh thu (VNĐ)', 'Ghi chú']);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563eb' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { horizontal: 'center' };
    });

    report.rows.forEach((row: any, i: number) => {
      const r = ws.addRow([i + 1, row.className, row.amount, '']);
      r.eachCell((cell, col) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (col === 3) {
          cell.numFmt = '#,##0';
          if (isTemplate) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
          }
        }
      });
    });

    const totalRow = ws.addRow(['', 'TỔNG CỘNG', report.grandTotal, '']);
    totalRow.eachCell((cell, col) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
      cell.border = { top: { style: 'double' }, left: { style: 'thin' }, bottom: { style: 'double' }, right: { style: 'thin' } };
      if (col === 3) cell.numFmt = '#,##0';
    });

    ws.addRow([]);
    if (isTemplate) {
      ws.addRow(['', '', '', `Ngày kê khai: ${new Date().toLocaleDateString('vi-VN')}`]);
      ws.addRow(['', '', '', 'Chữ ký:____________________']);
    }

    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 25;
    ws.getColumn(3).width = 20;
    ws.getColumn(4).width = 30;

    return wb.xlsx.writeBuffer() as Promise<Buffer>;
  }
}
