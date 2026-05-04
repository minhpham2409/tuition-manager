import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto, UpdateClassDto } from './dto';

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
}
