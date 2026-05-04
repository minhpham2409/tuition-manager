import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 10);

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'me@demo.com' },
    update: {},
    create: { email: 'me@demo.com', password: hash, name: 'Cô Giáo Demo' },
  });

  // Create bank account (BIDV)
  await prisma.bankAccount.upsert({
    where: { id: 'default-bank' },
    update: {},
    create: {
      id: 'default-bank',
      bankId: 'BIDV',
      accountNo: '4710000000000',
      accountName: 'NGUYEN THI DEMO',
      isDefault: true,
      userId: user.id,
    },
  });

  // Create classes
  const toan10 = await prisma.class.create({
    data: { name: 'Toán 10', tuitionFee: 500000, schedule: 'T3, T5 - 18:00', userId: user.id },
  });
  const anh9 = await prisma.class.create({
    data: { name: 'Anh Văn 9', tuitionFee: 400000, schedule: 'T2, T4 - 19:00', userId: user.id },
  });
  const ly11 = await prisma.class.create({
    data: { name: 'Lý 11', tuitionFee: 450000, schedule: 'T7 - 08:00', userId: user.id },
  });

  // Create students
  const students = [
    { name: 'Nguyễn Văn An', parentName: 'Nguyễn Thị Lan', parentPhone: '0901234567', classId: toan10.id },
    { name: 'Trần Minh Tuấn', parentName: 'Trần Văn Hùng', parentPhone: '0912345678', classId: toan10.id },
    { name: 'Lê Thị Hoa', parentName: 'Lê Văn Nam', parentPhone: '0923456789', classId: toan10.id },
    { name: 'Phạm Đức Anh', parentName: 'Phạm Thị Mai', parentPhone: '0934567890', classId: toan10.id },
    { name: 'Hoàng Thị Linh', parentName: 'Hoàng Văn Đức', parentPhone: '0945678901', classId: anh9.id },
    { name: 'Vũ Quang Huy', parentName: 'Vũ Thị Thu', parentPhone: '0956789012', classId: anh9.id },
    { name: 'Đặng Thanh Tùng', parentName: 'Đặng Văn Bình', parentPhone: '0967890123', classId: anh9.id },
    { name: 'Bùi Thị Ngọc', parentName: 'Bùi Văn Toàn', parentPhone: '0978901234', classId: ly11.id },
    { name: 'Ngô Minh Khôi', parentName: 'Ngô Thị Hằng', parentPhone: '0989012345', classId: ly11.id },
    { name: 'Dương Thị Mai', parentName: 'Dương Văn Long', parentPhone: '0990123456', classId: ly11.id },
  ];

  const createdStudents = [];
  for (const s of students) {
    createdStudents.push(await prisma.student.create({ data: s }));
  }

  // Create invoices for last 3 months
  const now = new Date();
  for (let offset = 2; offset >= 0; offset--) {
    let m = now.getMonth() + 1 - offset;
    let y = now.getFullYear();
    if (m <= 0) { m += 12; y -= 1; }

    for (const student of createdStudents) {
      const cls = [toan10, anh9, ly11].find(c => c.id === student.classId);
      const isPaid = offset > 0 ? Math.random() > 0.2 : Math.random() > 0.6;
      await prisma.invoice.create({
        data: {
          studentId: student.id,
          month: m,
          year: y,
          amount: cls!.tuitionFee,
          status: isPaid ? 'PAID' : 'UNPAID',
          paidAt: isPaid ? new Date(y, m - 1, Math.floor(Math.random() * 20) + 5) : null,
        },
      });
    }
  }

  console.log('✅ Seed completed! Login: me@demo.com / 123456');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
