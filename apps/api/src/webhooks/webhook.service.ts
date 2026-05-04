import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private prisma: PrismaService) {}

  async handlePayment(payload: {
    gateway?: string;
    transferAmount?: number;
    content?: string;
    referenceCode?: string;
    transactionDate?: string;
    transferType?: string;
  }) {
    // Only process incoming transfers
    if (payload.transferType && payload.transferType !== 'in') {
      return { matched: false, reason: 'Not an incoming transfer' };
    }

    const content = (payload.content || '').trim();
    const amount = payload.transferAmount || 0;

    // Save transaction regardless of match
    const tx = await this.prisma.transaction.create({
      data: {
        gateway: payload.gateway || 'unknown',
        amount,
        content,
        referenceCode: payload.referenceCode || null,
        transactionDate: payload.transactionDate ? new Date(payload.transactionDate) : new Date(),
      },
    });

    // Try to match: parse content like "HP T5 Nguyen Van An" or "HP T5 NGUYEN VAN AN"
    const match = content.match(/HP\s*T(\d{1,2})\s+(.+)/i);
    if (!match) {
      this.logger.warn(`Could not parse content: "${content}"`);
      return { matched: false, transactionId: tx.id, reason: 'Content format not recognized' };
    }

    const monthNum = parseInt(match[1]);
    const studentNameRaw = match[2].trim();
    const currentYear = new Date().getFullYear();

    // Helper: remove Vietnamese diacritics for fuzzy matching
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

    // Find all unpaid invoices for this month and match by normalized name
    const allUnpaid = await this.prisma.invoice.findMany({
      where: { month: monthNum, year: currentYear, status: 'UNPAID' },
      include: { student: true },
    });

    const normalizedSearch = normalize(studentNameRaw);
    const invoices = allUnpaid.filter(inv => {
      const normalizedName = normalize(inv.student.name);
      return normalizedName === normalizedSearch || normalizedName.includes(normalizedSearch) || normalizedSearch.includes(normalizedName);
    });

    if (invoices.length === 0) {
      this.logger.warn(`No matching invoice for: month=${monthNum}, student="${studentNameRaw}" (normalized: "${normalizedSearch}")`);
      return { matched: false, transactionId: tx.id, reason: 'No matching unpaid invoice found' };
    }

    // Match first found invoice
    const invoice = invoices[0];

    // Verify amount matches (allow small difference)
    if (Math.abs(invoice.amount - amount) > 1000) {
      this.logger.warn(`Amount mismatch: expected ${invoice.amount}, got ${amount}`);
      return { matched: false, transactionId: tx.id, reason: `Amount mismatch: expected ${invoice.amount}` };
    }

    // Mark invoice as paid
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PAID', paidAt: new Date(), note: `Auto: ${payload.referenceCode || content}` },
    });

    // Link transaction to invoice
    await this.prisma.transaction.update({
      where: { id: tx.id },
      data: { invoiceId: invoice.id, matched: true },
    });

    this.logger.log(`✅ Auto-matched: ${invoice.student.name} - T${monthNum} - ${amount}`);
    return {
      matched: true,
      transactionId: tx.id,
      invoiceId: invoice.id,
      studentName: invoice.student.name,
      month: monthNum,
      amount,
    };
  }

  async getRecentTransactions(userId: string, limit = 20) {
    return this.prisma.transaction.findMany({
      where: {
        OR: [
          { invoice: { student: { class: { userId } } } },
          { matched: false },
        ],
      },
      include: {
        invoice: { include: { student: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
