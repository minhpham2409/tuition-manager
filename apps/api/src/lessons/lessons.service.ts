import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

    // Parse schedule: "2,5" means Thứ 2 (Mon=1), Thứ 5 (Thu=4)
    const days = cls.schedule.split(',').map(d => {
      const n = parseInt(d.trim());
      // Vietnamese: T2=Monday(1), T3=Tue(2)...T7=Sat(6), CN=Sun(0)
      return n === 8 ? 0 : n - 1; // Convert to JS day (0=Sun, 1=Mon...)
    }).filter(d => !isNaN(d));

    const dates: Date[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d, 12, 0, 0); // noon to avoid timezone issues
      if (days.includes(date.getDay())) {
        dates.push(date);
      }
    }

    let created = 0;
    for (const date of dates) {
      try {
        await this.prisma.lesson.create({ data: { classId, date } });
        created++;
      } catch (e) {
        // Skip duplicates
      }
    }

    return { created, total: dates.length };
  }

  // Add single lesson
  async create(classId: string, date: string) {
    return this.prisma.lesson.create({
      data: { classId, date: new Date(date) },
    });
  }

  // Update lesson (mark taught, add note)
  async update(id: string, data: { taught?: boolean; note?: string }) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) return { error: 'Lesson not found' };
    // Once taught, cannot be reverted
    if (lesson.taught && data.taught === false) {
      return { error: 'Buổi đã xác nhận dạy không thể hoàn tác' };
    }
    return this.prisma.lesson.update({ where: { id }, data });
  }

  // Delete lesson (only if not taught)
  async remove(id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) return { error: 'Lesson not found' };
    if (lesson.taught) return { error: 'Không thể xóa buổi đã xác nhận dạy' };
    return this.prisma.lesson.delete({ where: { id } });
  }

  // Save attendance for a lesson
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

  // Generate invoices based on actual attendance
  async generateInvoices(classId: string, month: number, year: number) {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { students: true },
    });
    if (!cls) return { error: 'Class not found' };

    const pricePerLesson = cls.pricePerLesson || cls.tuitionFee;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get all taught lessons this month
    const taughtLessons = await this.prisma.lesson.findMany({
      where: { classId, date: { gte: startDate, lte: endDate }, taught: true },
      include: { attendances: true },
    });

    const totalLessons = taughtLessons.length;
    if (totalLessons === 0) return { error: 'Chưa có buổi dạy nào được đánh dấu trong tháng này' };

    let created = 0;
    for (const student of cls.students) {
      // Count lessons this student was absent
      let absences = 0;
      for (const lesson of taughtLessons) {
        const att = lesson.attendances.find(a => a.studentId === student.id);
        if (att && !att.present) absences++;
      }

      const lessonsAttended = totalLessons - absences;
      const amount = cls.pricePerLesson
        ? cls.pricePerLesson * lessonsAttended
        : cls.tuitionFee; // fallback to flat fee if no per-lesson price

      try {
        await this.prisma.invoice.upsert({
          where: { studentId_month_year: { studentId: student.id, month, year } },
          create: {
            studentId: student.id, month, year, amount,
            lessonsTotal: totalLessons, lessonsAttended,
            note: absences > 0 ? `Nghỉ ${absences} buổi` : undefined,
          },
          update: {
            amount, lessonsTotal: totalLessons, lessonsAttended,
            note: absences > 0 ? `Nghỉ ${absences} buổi` : undefined,
          },
        });
        created++;
      } catch (e) {}
    }

    return { created, total: cls.students.length, totalLessons, pricePerLesson };
  }

  // Get attendance report for a class/month (for parents)
  async getReport(classId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { students: { orderBy: { name: 'asc' } } },
    });
    if (!cls) return { error: 'Class not found' };

    const lessons = await this.prisma.lesson.findMany({
      where: { classId, date: { gte: startDate, lte: endDate }, taught: true },
      include: { attendances: true },
      orderBy: { date: 'asc' },
    });

    const report = cls.students.map(student => {
      const lessonDetails = lessons.map(lesson => {
        const att = lesson.attendances.find(a => a.studentId === student.id);
        return {
          date: lesson.date,
          present: att ? att.present : null,
          note: att?.note || null,
        };
      });
      const attended = lessonDetails.filter(l => l.present === true).length;
      const absent = lessonDetails.filter(l => l.present === false).length;
      const total = lessons.length;
      const amount = cls.pricePerLesson ? cls.pricePerLesson * attended : cls.tuitionFee;

      return {
        studentId: student.id,
        studentName: student.name,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        total,
        attended,
        absent,
        amount,
        lessons: lessonDetails,
      };
    });

    return {
      className: cls.name,
      month,
      year,
      pricePerLesson: cls.pricePerLesson,
      totalLessons: lessons.length,
      lessonDates: lessons.map(l => l.date),
      students: report,
    };
  }
}
