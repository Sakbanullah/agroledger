import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateDebtDto {
  @IsNumber()
  @Min(1)
  personId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  transactionDate: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}