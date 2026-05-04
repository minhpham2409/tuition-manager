import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateClassDto {
  @IsNotEmpty() @IsString()
  name: string;

  @IsNumber() @Min(0)
  tuitionFee: number;

  @IsOptional() @IsNumber() @Min(0)
  pricePerLesson?: number;

  @IsOptional() @IsString()
  schedule?: string;

  @IsOptional() @IsString()
  scheduleTime?: string;
}

export class UpdateClassDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsNumber() @Min(0)
  tuitionFee?: number;

  @IsOptional() @IsNumber() @Min(0)
  pricePerLesson?: number;

  @IsOptional() @IsString()
  schedule?: string;

  @IsOptional() @IsString()
  scheduleTime?: string;
}
