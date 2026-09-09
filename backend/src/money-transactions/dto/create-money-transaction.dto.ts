import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateMoneyTransactionDto {
  @IsIn(['IN', 'OUT'])
  type: string;

  @IsIn([
    'OPERASIONAL',
    'WARUNG',
    'PERTANIAN',
    'TRANSPORTASI',
    'PERAWATAN',
    'LAINNYA',
  ])
  category: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  transactionDate: string;

  @IsOptional()
  @IsString()
  description?: string;
}