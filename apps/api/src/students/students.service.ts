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
