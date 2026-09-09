import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

enum CreditTransactionType {
  DEBT = 'DEBT',
  PAYMENT = 'PAYMENT',
}

export class CreateCreditTransactionDto {
  @IsInt()
  @Min(1)
  creditAccountId: number;

  @IsEnum(CreditTransactionType)
  type: CreditTransactionType;

  @IsNumber()
  @Min(0)
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