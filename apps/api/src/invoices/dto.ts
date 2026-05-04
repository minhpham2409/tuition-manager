import { IsInt, IsNotEmpty, IsOptional, IsString, Min, IsEnum } from 'class-validator';

export class GenerateInvoicesDto {
  @IsNotEmpty() @IsString()
  classId: string;

  @IsInt() @Min(1)
  month: number;

  @IsInt() @Min(2020)
  year: number;
}

export class UpdateInvoiceDto {
  @IsOptional() @IsEnum(['UNPAID', 'PAID', 'PARTIAL'])
  status?: string;

  @IsOptional() @IsInt() @Min(0)
  amount?: number;

  @IsOptional() @IsString()
  note?: string;
}
