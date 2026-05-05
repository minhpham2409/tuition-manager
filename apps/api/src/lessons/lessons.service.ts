import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  // Get lessons for a class in a month
  async findByMonth(classId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const lessons = await this.prisma.lesson.findMany({
      where: { classId, date: { gte: startDate, lte: endDate } },
      include: {
        attendances: { include: { student: { select: { id: true, name: true } } } },
      },
      orderBy: { date: 'asc' },
    });

    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { students: { select: { id: true, name: true }, orderBy: { name: 'asc' } } },
    });

    return { lessons, students: cls?.students || [], className: cls?.name, pricePerLesson: cls?.pricePerLesson };
  }

  // Auto-generate lesson dates from class schedule (e.g. "2,5" = Mon, Thu)
  async generateFromSchedule(classId: string, month: number, year: number) {
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls?.schedule) return { created: 0, message: 'Lớp chưa có lịch học' };

    const days = cls.schedule.split(',').map(d => {
      const n = parseInt(d.trim());
      return n === 8 ? 0 : n - 1;
    }).filter(d => !isNaN(d));

    const dates: Date[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d, 12, 0, 0);
      if (days.includes(date.getDay())) dates.push(date);
    }

    let created = 0;
    for (const date of dates) {
      try {
        await this.prisma.lesson.create({ data: { classId, date } });
        created++;
      } catch (e) { /* Skip duplicates */ }
    }
    return { created, total: dates.length };
  }

  async create(classId: string, date: string) {
    return this.prisma.lesson.create({ data: { classId, date: new Date(date) } });
  }

  async update(id: string, data: { taught?: boolean; note?: string }) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) return { error: 'Lesson not found' };
    if (lesson.taught && data.taught === false) return { error: 'Buổi đã xác nhận dạy không thể hoàn tác' };
    return this.prisma.lesson.update({ where: { id }, data });
  }

  async remove(id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) return { error: 'Lesson not found' };
    if (lesson.taught) return { error: 'Không thể xóa buổi đã xác nhận dạy' };
    return this.prisma.lesson.delete({ where: { id } });
  }

  async saveAttendance(lessonId: string, records: { studentId: string; present: boolean; note?: string }[]) {
    const results = [];
    for (const rec of records) {
      const result = await this.prisma.attendance.upsert({
        where: { lessonId_studentId: { lessonId, studentId: rec.studentId } },
        create: { lessonId, studentId: rec.studentId, present: rec.present, note: rec.note },
        update: { present: rec.present, note: rec.note },
      });
      results.push(result);
    }
    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE INVOICES — the core billing logic
  // ═══════════════════════════════════════════════════════════════════════════
  async generateInvoices(classId: string, month: number, year: number) {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { students: true },
    });
    if (!cls) return { error: 'Class not found' };

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const taughtLessons = await this.prisma.lesson.findMany({
      where: { classId, date: { gte: startDate, lte: endDate }, taught: true },
      include: { attendances: true },
      orderBy: { date: 'asc' },
    });

    const totalLessons = taughtLessons.length;
    if (totalLessons === 0) return { error: 'Chưa có buổi dạy nào được đánh dấu trong tháng này' };

    let created = 0, updated = 0, skippedPaid = 0, supplementary = 0;
    const details: any[] = [];

    for (const student of cls.students) {
      // ── 1. Filter lessons by student join date ──
      const joinDate = new Date(student.createdAt);
      joinDate.setHours(0, 0, 0, 0);

      const eligibleLessons = taughtLessons.filter(lesson => {
        const ld = new Date(lesson.date);
        ld.setHours(0, 0, 0, 0);
        return ld >= joinDate;
      });

      // ── 2. Count actual attendance ──
      let lessonsAttended = 0;
      let absences = 0;
      const eligibleLessonIds: string[] = [];

      for (const lesson of eligibleLessons) {
        eligibleLessonIds.push(lesson.id);
        const att = lesson.attendances.find(a => a.studentId === student.id);
        if (!att || att.present) {
          // No record = present (teacher didn't mark absent)
          lessonsAttended++;
        } else {
          absences++;
        }
      }

      const eligibleTotal = eligibleLessons.length;
      const amount = cls.pricePerLesson
        ? cls.pricePerLesson * lessonsAttended
        : cls.tuitionFee;

      // Build note
      const noteParts: string[] = [];
      if (eligibleTotal < totalLessons) {
        noteParts.push(`Vào lớp từ ${joinDate.getDate()}/${month}`);
      }
      if (absences > 0) noteParts.push(`Nghỉ ${absences} buổi`);
      const note = noteParts.join(', ') || undefined;

      // ── 3. Handle existing invoices ──
      const existingInvoices = await this.prisma.invoice.findMany({
        where: { studentId: student.id, month, year },
        orderBy: { createdAt: 'asc' },
      });

      // Collect all lesson IDs already billed in existing PAID invoices
      const alreadyBilledLessonIds = new Set<string>();
      let hasUnpaidInvoice = false;
      let unpaidInvoiceId: string | null = null;

      for (const inv of existingInvoices) {
        if (inv.status === 'PAID') {
          // Parse the lessonsCounted field to know which lessons were already paid for
          if (inv.lessonsCounted) {
            try {
              const ids = JSON.parse(inv.lessonsCounted) as string[];
              ids.forEach(id => alreadyBilledLessonIds.add(id));
            } catch {}
          }
        } else {
          // There's an existing unpaid invoice
          hasUnpaidInvoice = true;
          unpaidInvoiceId = inv.id;
        }
      }

      if (alreadyBilledLessonIds.size === 0 && existingInvoices.length === 0) {
        // ── Case A: No invoices exist → create new ──
        await this.prisma.invoice.create({
          data: {
            studentId: student.id, month, year, amount,
            lessonsTotal: totalLessons, lessonsAttended,
            lessonsCounted: JSON.stringify(eligibleLessonIds),
            note,
          },
        });
        created++;
        details.push({ student: student.name, action: 'tạo mới', lessons: `${lessonsAttended}/${eligibleTotal}`, amount });

      } else if (alreadyBilledLessonIds.size > 0) {
        // ── Case B: Student has PAID invoices ──
        // Find NEW lessons not yet billed
        const newLessonIds = eligibleLessonIds.filter(id => !alreadyBilledLessonIds.has(id));
        if (newLessonIds.length === 0) {
          skippedPaid++;
          details.push({ student: student.name, action: 'đã đóng đủ', lessons: `${alreadyBilledLessonIds.size} buổi đã thanh toán`, amount: 0 });
        } else {
          // Count attendance for only the NEW lessons
          let newAttended = 0;
          for (const lid of newLessonIds) {
            const lesson = taughtLessons.find(l => l.id === lid);
            if (!lesson) continue;
            const att = lesson.attendances.find(a => a.studentId === student.id);
            if (!att || att.present) newAttended++;
          }
          const suppAmount = cls.pricePerLesson
            ? cls.pricePerLesson * newAttended
            : 0; // flat fee already paid

          if (suppAmount > 0) {
            // Update existing unpaid or create supplementary
            if (hasUnpaidInvoice && unpaidInvoiceId) {
              await this.prisma.invoice.update({
                where: { id: unpaidInvoiceId },
                data: {
                  amount: suppAmount,
                  lessonsTotal: newLessonIds.length,
                  lessonsAttended: newAttended,
                  lessonsCounted: JSON.stringify(newLessonIds),
                  note: `Bổ sung ${newLessonIds.length} buổi mới`,
                },
              });
              updated++;
              details.push({ student: student.name, action: 'cập nhật bổ sung', lessons: `+${newAttended} buổi mới`, amount: suppAmount });
            } else {
              await this.prisma.invoice.create({
                data: {
                  studentId: student.id, month, year,
                  amount: suppAmount,
                  lessonsTotal: newLessonIds.length,
                  lessonsAttended: newAttended,
                  lessonsCounted: JSON.stringify(newLessonIds),
                  note: `Bổ sung ${newLessonIds.length} buổi mới`,
                },
              });
              supplementary++;
              details.push({ student: student.name, action: 'tạo HĐ bổ sung', lessons: `+${newAttended} buổi mới`, amount: suppAmount });
            }
          } else {
            skippedPaid++;
            details.push({ student: student.name, action: 'không phát sinh thêm', lessons: '0 buổi mới', amount: 0 });
          }
        }

      } else if (hasUnpaidInvoice && unpaidInvoiceId) {
        // ── Case C: Existing UNPAID invoice → update it ──
        await this.prisma.invoice.update({
          where: { id: unpaidInvoiceId },
          data: {
            amount, lessonsTotal: totalLessons, lessonsAttended,
            lessonsCounted: JSON.stringify(eligibleLessonIds),
            note,
          },
        });
        updated++;
        details.push({ student: student.name, action: 'cập nhật', lessons: `${lessonsAttended}/${eligibleTotal}`, amount });
      }
    }

    return {
      created, updated, supplementary, skippedPaid,
      total: cls.students.length,
      totalLessons,
      pricePerLesson: cls.pricePerLesson || cls.tuitionFee,
      details,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORT — attendance report for a class/month
  // ═══════════════════════════════════════════════════════════════════════════
  async getReport(classId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const now = new Date();
    const lastDayOfMonth = new Date(year, month, 0, 23, 59, 59);
    const endDate = now < lastDayOfMonth ? now : lastDayOfMonth;

    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { students: { orderBy: { name: 'asc' } } },
    });
    if (!cls) throw new NotFoundException('Class not found');

    const lessons = await this.prisma.lesson.findMany({
      where: { classId, date: { gte: startDate, lte: endDate }, taught: true },
      include: { attendances: true },
      orderBy: { date: 'asc' },
    });

    const students = cls.students.map(student => {
      const joinDate = new Date(student.createdAt);
      joinDate.setHours(0, 0, 0, 0);

      const lessonDetails = lessons.map(lesson => {
        const lessonDate = new Date(lesson.date);
        lessonDate.setHours(0, 0, 0, 0);
        const isEligible = lessonDate >= joinDate;

        if (!isEligible) {
          // Student hadn't joined yet — mark as N/A
          return { date: lesson.date, present: null, note: 'Chưa vào lớp', eligible: false };
        }

        const att = lesson.attendances.find(a => a.studentId === student.id);
        return {
          date: lesson.date,
          present: att ? att.present : true, // no record = present
          note: att?.note || null,
          eligible: true,
        };
      });

      const eligibleLessons = lessonDetails.filter(l => l.eligible);
      const attended = eligibleLessons.filter(l => l.present === true).length;
      const absent = eligibleLessons.filter(l => l.present === false).length;
      const total = eligibleLessons.length;
      const amount = cls.pricePerLesson ? cls.pricePerLesson * attended : cls.tuitionFee;

      return {
        studentId: student.id,
        studentName: student.name,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        joinedAt: student.createdAt,
        total,           // eligible lessons only
        totalAll: lessons.length, // all lessons in month
        attended,
        absent,
        amount,
        lessons: lessonDetails,
      };
    });

    return {
      className: cls.name, month, year,
      pricePerLesson: cls.pricePerLesson,
      totalLessons: lessons.length,
      lessonDates: lessons.map(l => l.date),
      students,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT — Excel attendance sheet
  // ═══════════════════════════════════════════════════════════════════════════
  async exportAttendanceExcel(classId: string, month: number, year: number): Promise<Buffer> {
    const data = await this.getReport(classId, month, year);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Điểm danh');

    const lessonCount = data.lessonDates.length;
    const colCount = 3 + lessonCount + 1;

    ws.mergeCells(1, 1, 1, colCount);
    const t1 = ws.getCell('A1');
    t1.value = `DANH SÁCH HỌC SINH LỚP ${(data.className || '').toUpperCase()}`;
    t1.font = { bold: true, size: 13 };
    t1.alignment = { horizontal: 'center' };

    ws.mergeCells(2, 1, 2, colCount);
    const t2 = ws.getCell('A2');
    t2.value = `HỌC THÊM THÁNG ${month}/${year}${lessonCount === 0 ? ' (Chưa có buổi dạy)' : ` — ${lessonCount} buổi`}`;
    t2.alignment = { horizontal: 'center' };
    t2.font = { italic: true };

    const dateHeaders = data.lessonDates.map((d: Date) => {
      const dt = new Date(d);
      return `${dt.getDate()}/${dt.getMonth() + 1}`;
    });
    const headerRow = ws.addRow(['STT', 'Họ và tên', 'Lớp trường', ...dateHeaders, 'Số tiền']);
    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { horizontal: 'center' };
    });

    data.students.forEach((s: any, i: number) => {
      const attendance = s.lessons.map((l: any) => {
        if (!l.eligible) return '—'; // wasn't in class yet
        return l.present !== false ? 'x' : '0';
      });
      const rowData = [i + 1, s.studentName, '', ...attendance, s.amount];
      const r = ws.addRow(rowData);
      r.eachCell((cell, col) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (col === colCount) {
          cell.numFmt = '#,##0';
          cell.font = { color: { argb: 'FFCC0000' }, bold: true };
        }
        if (col > 3 && col < colCount) cell.alignment = { horizontal: 'center' };
      });
    });

    const totalAmount = data.students.reduce((s: number, st: any) => s + st.amount, 0);
    const totalRow = ws.addRow([`Tổng ${lessonCount} buổi`, '', '', ...data.lessonDates.map(() => ''), totalAmount]);
    totalRow.eachCell((cell, col) => {
      cell.font = { bold: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      if (col === colCount) { cell.numFmt = '#,##0'; cell.font = { bold: true, color: { argb: 'FFCC0000' } }; }
    });

    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 24;
    ws.getColumn(3).width = 10;
    for (let c = 4; c <= colCount; c++) ws.getColumn(c).width = 10;

    return wb.xlsx.writeBuffer() as Promise<Buffer>;
  }

  // Generate a blank attendance template for a class
  async generateAttendanceTemplate(classId: string, month: number, year: number): Promise<Buffer> {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { students: { orderBy: { name: 'asc' } } },
    });
    if (!cls) throw new NotFoundException('Class not found');

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Điểm danh');

    const lessonSlots = 5;
    const colCount = 3 + lessonSlots + 1;

    ws.mergeCells(1, 1, 1, colCount);
    const t1 = ws.getCell('A1');
    t1.value = `DANH SÁCH HỌC SINH LỚP ${cls.name.toUpperCase()}`;
    t1.font = { bold: true, size: 13 };
    t1.alignment = { horizontal: 'center' };

    ws.mergeCells(2, 1, 2, colCount);
    const t2 = ws.getCell('A2');
    t2.value = `HỌC THÊM THÁNG ${month}/${year} — (FILE MẪU — Điền ngày và x vào ô tương ứng)`;
    t2.alignment = { horizontal: 'center' };
    t2.font = { italic: true, color: { argb: 'FF666666' } };

    const dateSlots = Array.from({ length: lessonSlots }, (_, i) => `Ngày ${i + 1}`);
    const headerRow = ws.addRow(['STT', 'Họ và tên', 'Lớp trường', ...dateSlots, 'Số tiền']);
    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { horizontal: 'center' };
    });

    cls.students.forEach((s, i) => {
      const r = ws.addRow([i + 1, s.name, '', ...Array(lessonSlots).fill('x'), '']);
      r.eachCell((cell, col) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (col === colCount) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
        }
        if (col > 3 && col < colCount) cell.alignment = { horizontal: 'center' };
      });
    });

    ws.addRow([`Tổng ${lessonSlots} buổi`, '', '', ...Array(lessonSlots).fill(''), '']);

    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 24;
    ws.getColumn(3).width = 10;
    for (let c = 4; c <= colCount; c++) ws.getColumn(c).width = 10;

    return wb.xlsx.writeBuffer() as Promise<Buffer>;
  }
}
