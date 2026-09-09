import {
  IsDateString,
  IsIn,
  IsOptional,
} from 'class-validator';

export class CashFlowQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'])
  period?: 'daily' | 'weekly' | 'monthly';
}