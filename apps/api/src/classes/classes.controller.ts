import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClassesService } from './classes.service';
import { CreateClassDto, UpdateClassDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('classes')
export class ClassesController {
  constructor(private svc: ClassesService) {}

  @Get()
  findAll(@Request() req) {
    return this.svc.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.svc.findOne(id, req.user.userId);
  }

  @Post()
  create(@Body() dto: CreateClassDto, @Request() req) {
    return this.svc.create(dto, req.user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClassDto, @Request() req) {
    return this.svc.update(id, dto, req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.svc.remove(id, req.user.userId);
  }

  @Post('import-excel')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.svc.importFromExcel(file.buffer, req.user.userId);
  }
}

