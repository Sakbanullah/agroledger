import { IsNumber, IsOptional, Min } from 'class-validator';

export class SetCommissionDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionRatePerKg?: number;
}
