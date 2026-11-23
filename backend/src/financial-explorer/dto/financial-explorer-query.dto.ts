import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { Direction } from '../money-flow-role';

export const MONEY_CATEGORIES = [
  'HARVEST_SALE',
  'OPENING_BALANCE',
  'OWNER_SETTLEMENT',
  'RUBBER_WORKER_SETTLEMENT',
  'SALE_CANCELLATION',
  'OPERASIONAL',
  'WARUNG',
  'PERTANIAN',
  'TRANSPORTASI',
  'PERAWATAN',
  'LAINNYA',
] as const;

export class FinancialExplorerQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly'])
  period?: 'daily' | 'weekly' | 'monthly';

  @IsOptional()
  @IsIn(['IN', 'OUT'])
  type?: Direction;

  @IsOptional()
  @IsIn(MONEY_CATEGORIES)
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  farmId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
