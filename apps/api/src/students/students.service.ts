import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto, UpdateStudentDto } from './dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string, classId?: string) {
    return this.prisma.student.findMany({
      where: {
        class: { userId },
        ...(classId ? { classId } : {}),
      },
      include: { class: { select: { name: true, tuitionFee: true } } },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.student.findUnique({
      where: { id },
      include: { class: true, invoices: { orderBy: { year: 'desc' } } },
    });
  }

  async getStats(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        class: { include: { user: { select: { name: true } } } },
        invoices: { orderBy: [{ year: 'desc' }, { month: 'desc' }] },
        attendances: {
          include: { lesson: true },
          orderBy: { lesson: { date: 'desc' } },
        },
      },
    });
    if (!student) return { error: 'Not found' };

    const taughtAttendances = student.attendances.filter(a => a.lesson.taught);
    const totalLessons = taughtAttendances.length;
    const presentCount = taughtAttendances.filter(a => a.present).length;
    const absentCount = totalLessons - presentCount;
    const attendanceRate = totalLessons > 0 ? Math.round((presentCount / totalLessons) * 100) : 0;

    const totalPaid = student.invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
    const totalUnpaid = student.invoices.filter(i => i.status !== 'PAID').reduce((s, i) => s + i.amount, 0);

    // Monthly trend: group attendance by month
    const monthlyMap = new Map<string, { present: number; absent: number; total: number }>();
    taughtAttendances.forEach(a => {
      const d = new Date(a.lesson.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!monthlyMap.has(key)) monthlyMap.set(key, { present: 0, absent: 0, total: 0 });
      const m = monthlyMap.get(key)!;
      m.total++;
      if (a.present) m.present++; else m.absent++;
    });

    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([key, val]) => {
        const [y, m] = key.split('-').map(Number);
        return { year: y, month: m, ...val, rate: Math.round((val.present / val.total) * 100) };
      })
      .sort((a, b) => a.year - b.year || a.month - b.month);

    return {
      id: student.id,
      name: student.name,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      className: student.class.name,
      classId: student.classId,
      teacherName: student.class.user.name,
      totalLessons,
      presentCount,
      absentCount,
      attendanceRate,
      totalPaid,
      totalUnpaid,
      invoices: student.invoices,
      attendances: taughtAttendances.map(a => ({
        date: a.lesson.date,
        present: a.present,
        note: a.note,
      })),
      monthlyTrend,
    };
  }

  create(dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: dto,
      include: { class: { select: { name: true } } },
    });
  }

  update(id: string, dto: UpdateStudentDto) {
    return this.prisma.student.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.prisma.student.delete({ where: { id } });
    return { deleted: true };
  }
}
