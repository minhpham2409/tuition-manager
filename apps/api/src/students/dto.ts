import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStudentDto {
  @IsNotEmpty() @IsString()
  name: string;

  @IsNotEmpty() @IsString()
  parentName: string;

  @IsOptional() @IsString()
  parentPhone?: string;

  @IsNotEmpty() @IsString()
  classId: string;
}

export class UpdateStudentDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  parentName?: string;

  @IsOptional() @IsString()
  parentPhone?: string;

  @IsOptional() @IsString()
  classId?: string;
}
