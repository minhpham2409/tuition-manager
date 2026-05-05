import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto, UpdateClassDto } from './dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.class.findMany({
      where: { userId },
      include: { _count: { select: { students: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string, userId: string) {
    return this.prisma.class.findFirst({
      where: { id, userId },
      include: { students: true },
    });
  }

  create(dto: CreateClassDto, userId: string) {
    return this.prisma.class.create({
      data: { ...dto, userId },
    });
  }

  update(id: string, dto: UpdateClassDto, userId: string) {
    return this.prisma.class.updateMany({
      where: { id, userId },
      data: dto,
    });
  }

  async remove(id: string, userId: string) {
    await this.prisma.class.deleteMany({ where: { id, userId } });
    return { deleted: true };
  }

  async importFromExcel(buffer: Buffer, userId: string) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error('File Excel không hợp lệ');

    // Expected format: Row 1 = Class name, Row 2 = Price per lesson
    // Row 3 = headers (STT | Họ và tên | ...)
    // Row 4+ = student rows

    const classNameCell = ws.getCell('B1').value || ws.getCell('A1').value;
    const priceCell = ws.getCell('B2').value;

    const className = String(classNameCell || '').trim();
    const pricePerLesson = parseInt(String(priceCell || '0').replace(/[^0-9]/g, '')) || 0;

    if (!className) throw new Error('Không tìm thấy tên lớp ở ô B1 hoặc A1');

    // Create or get class
    let cls = await this.prisma.class.findFirst({ where: { name: className, userId } });
    if (!cls) {
      cls = await this.prisma.class.create({
        data: { name: className, tuitionFee: pricePerLesson, pricePerLesson, userId },
      });
    }

    const students = [];
    let headerFound = false;
    ws.eachRow((row, rowNumber) => {
      if (rowNumber < 3) return; // skip title rows
      const col1 = String(row.getCell(1).value || '').trim();
      const col2 = String(row.getCell(2).value || '').trim();

      // Skip header row
      if (!headerFound && (col2.toLowerCase().includes('họ') || col2.toLowerCase().includes('tên') || col2.toLowerCase().includes('họ và tên'))) {
        headerFound = true;
        return;
      }

      // Skip empty or total rows
      if (!col2 || col2.toLowerCase().includes('tổng') || isNaN(parseInt(col1))) return;

      const name = col2.trim();
      const schoolClass = String(row.getCell(3).value || '').trim();
      if (name) students.push({ name, schoolClass });
    });

    let created = 0;
    for (const s of students) {
      const exists = await this.prisma.student.findFirst({ where: { name: s.name, classId: cls.id } });
      if (!exists) {
        await this.prisma.student.create({ data: { name: s.name, classId: cls.id } });
        created++;
      }
    }

    return { className: cls.name, classId: cls.id, studentsImported: created, totalStudents: students.length };
  }
}

