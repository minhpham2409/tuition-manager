import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.attendance.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash('123456', 10);
  const user = await prisma.user.create({
    data: { email: 'me@demo.com', password: hash, name: 'Cô Giáo Demo' },
  });

  await prisma.bankAccount.create({
    data: { id: 'default-bank', bankId: 'BIDV', accountNo: '4710000000000', accountName: 'NGUYEN THI DEMO', isDefault: true, userId: user.id },
  });

  // Classes with pricePerLesson and schedule
  const toan10 = await prisma.class.create({
    data: { name: 'Toán 10', tuitionFee: 100000, pricePerLesson: 100000, schedule: '4,6', scheduleTime: '18:00', userId: user.id },
  });
  const anh9 = await prisma.class.create({
    data: { name: 'Anh Văn 9', tuitionFee: 80000, pricePerLesson: 80000, schedule: '3,5', scheduleTime: '19:00', userId: user.id },
  });
  const ly11 = await prisma.class.create({
    data: { name: 'Lý 11', tuitionFee: 90000, pricePerLesson: 90000, schedule: '7', scheduleTime: '08:00', userId: user.id },
  });
  const hoa12 = await prisma.class.create({
    data: { name: 'Hóa 12', tuitionFee: 95000, pricePerLesson: 95000, schedule: '2,4', scheduleTime: '19:30', userId: user.id },
  });
  const van10 = await prisma.class.create({
    data: { name: 'Văn 10', tuitionFee: 85000, pricePerLesson: 85000, schedule: '3,6', scheduleTime: '17:00', userId: user.id },
  });

  const allClasses = [toan10, anh9, ly11, hoa12, van10];

  // Students data
  const studentData = [
    // Toán 10 (6 HS)
    { name: 'Nguyễn Văn An', parentName: 'Nguyễn Thị Lan', parentPhone: '0901234567', classId: toan10.id },
    { name: 'Trần Minh Tuấn', parentName: 'Trần Văn Hùng', parentPhone: '0912345678', classId: toan10.id },
    { name: 'Lê Thị Hoa', parentName: 'Lê Văn Nam', parentPhone: '0978102929', classId: toan10.id },
    { name: 'Phạm Đức Anh', parentName: 'Phạm Thị Mai', parentPhone: '0934567890', classId: toan10.id },
    { name: 'Đỗ Thanh Hà', parentName: 'Đỗ Văn Thắng', parentPhone: '0908765432', classId: toan10.id },
    { name: 'Vương Thị Ngọc', parentName: 'Vương Văn Phúc', parentPhone: '0917654321', classId: toan10.id },
    // Anh Văn 9 (5 HS)
    { name: 'Hoàng Thị Linh', parentName: 'Hoàng Văn Đức', parentPhone: '0945678901', classId: anh9.id },
    { name: 'Vũ Quang Huy', parentName: 'Vũ Thị Thu', parentPhone: '0956789012', classId: anh9.id },
    { name: 'Đặng Thanh Tùng', parentName: 'Đặng Văn Bình', parentPhone: '0967890123', classId: anh9.id },
    { name: 'Cao Thị Phương', parentName: 'Cao Văn Minh', parentPhone: '0926543210', classId: anh9.id },
    { name: 'Lý Hoàng Nam', parentName: 'Lý Thị Hạnh', parentPhone: '0935432109', classId: anh9.id },
    // Lý 11 (4 HS)
    { name: 'Bùi Thị Ngọc', parentName: 'Bùi Văn Toàn', parentPhone: '0978901234', classId: ly11.id },
    { name: 'Ngô Minh Khôi', parentName: 'Ngô Thị Hằng', parentPhone: '0989012345', classId: ly11.id },
    { name: 'Dương Thị Mai', parentName: 'Dương Văn Long', parentPhone: '0915904790', classId: ly11.id },
    { name: 'Tống Văn Đạt', parentName: 'Tống Thị Yến', parentPhone: '0944321098', classId: ly11.id },
    // Hóa 12 (5 HS)
    { name: 'Trịnh Quốc Bảo', parentName: 'Trịnh Văn Hải', parentPhone: '0953210987', classId: hoa12.id },
    { name: 'Mai Thị Hương', parentName: 'Mai Văn Tú', parentPhone: '0962109876', classId: hoa12.id },
    { name: 'Phan Đình Khang', parentName: 'Phan Thị Liên', parentPhone: '0971098765', classId: hoa12.id },
    { name: 'Lương Thị Thảo', parentName: 'Lương Văn Quang', parentPhone: '0980987654', classId: hoa12.id },
    { name: 'Đinh Công Minh', parentName: 'Đinh Thị Ngân', parentPhone: '0900876543', classId: hoa12.id },
    // Văn 10 (4 HS)
    { name: 'Hà Thị Thanh', parentName: 'Hà Văn Trường', parentPhone: '0919876543', classId: van10.id },
    { name: 'Tạ Minh Quân', parentName: 'Tạ Thị Hoa', parentPhone: '0928765432', classId: van10.id },
    { name: 'Châu Thị Uyên', parentName: 'Châu Văn Khải', parentPhone: '0937654321', classId: van10.id },
    { name: 'Kiều Đức Trí', parentName: 'Kiều Thị Mai', parentPhone: '0946543210', classId: van10.id },
  ];

  const students: any[] = [];
  for (const s of studentData) {
    students.push(await prisma.student.create({ data: s }));
  }

  // Generate historical data for months: T3, T4 (past) + T5 current
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Helper: get schedule days for a class in a month
  function getScheduleDates(schedule: string, m: number, y: number, limitDay?: number): Date[] {
    const days = schedule.split(',').map(d => { const n = parseInt(d.trim()); return n === 8 ? 0 : n - 1; }).filter(d => !isNaN(d));
    const dates: Date[] = [];
    const dim = new Date(y, m, 0).getDate();
    const maxDay = limitDay || dim;
    for (let d = 1; d <= maxDay; d++) {
      const date = new Date(y, m - 1, d, 12, 0, 0);
      if (days.includes(date.getDay())) dates.push(date);
    }
    return dates;
  }

  // Past months: T3/2026, T4/2026
  for (let offset = 2; offset >= 1; offset--) {
    let m = currentMonth - offset;
    let y = currentYear;
    if (m <= 0) { m += 12; y -= 1; }

    for (const cls of allClasses) {
      if (!cls.schedule) continue;
      const dates = getScheduleDates(cls.schedule, m, y);
      const classStudents = students.filter(s => s.classId === cls.id);

      for (const date of dates) {
        const lesson = await prisma.lesson.create({
          data: { classId: cls.id, date, taught: true },
        });

        // Random attendance: ~15% absence rate
        for (const student of classStudents) {
          const present = Math.random() > 0.15;
          await prisma.attendance.create({
            data: { lessonId: lesson.id, studentId: student.id, present, note: present ? null : 'Nghỉ phép' },
          });
        }
      }

      // Create invoices for this month
      const taughtLessons = await prisma.lesson.findMany({
        where: { classId: cls.id, date: { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59) }, taught: true },
        include: { attendances: true },
      });

      for (const student of classStudents) {
        let absences = 0;
        for (const lesson of taughtLessons) {
          const att = lesson.attendances.find(a => a.studentId === student.id);
          if (att && !att.present) absences++;
        }
        const attended = taughtLessons.length - absences;
        const amount = cls.pricePerLesson! * attended;
        const isPaid = Math.random() > 0.15; // 85% paid
        await prisma.invoice.create({
          data: {
            studentId: student.id, month: m, year: y, amount,
            lessonsTotal: taughtLessons.length, lessonsAttended: attended,
            status: isPaid ? 'PAID' : 'UNPAID',
            paidAt: isPaid ? new Date(y, m - 1, Math.floor(Math.random() * 10) + 15) : null,
            note: absences > 0 ? `Nghỉ ${absences} buổi` : undefined,
          },
        });
      }
    }
  }

  // Current month (T5/2026) — only past days get lessons
  const today = now.getDate();
  for (const cls of allClasses) {
    if (!cls.schedule) continue;
    const dates = getScheduleDates(cls.schedule, currentMonth, currentYear, today);
    const classStudents = students.filter(s => s.classId === cls.id);

    for (const date of dates) {
      const isPast = date.getDate() < today;
      const lesson = await prisma.lesson.create({
        data: { classId: cls.id, date, taught: isPast }, // only mark past as taught
      });

      if (isPast) {
        for (const student of classStudents) {
          const present = Math.random() > 0.12;
          await prisma.attendance.create({
            data: { lessonId: lesson.id, studentId: student.id, present, note: present ? null : 'Nghỉ phép' },
          });
        }
      }
    }

    // Also generate future lesson dates for this month
    const futureDates = getScheduleDates(cls.schedule, currentMonth, currentYear).filter(d => d.getDate() > today);
    for (const date of futureDates) {
      try {
        await prisma.lesson.create({ data: { classId: cls.id, date, taught: false } });
      } catch {}
    }
  }

  console.log(`Seed hoàn tất! ${students.length} học sinh, ${allClasses.length} lớp`);
  console.log('Login: me@demo.com / 123456');
}

main().catch(console.error).finally(() => prisma.$disconnect());
