import { IsNumber, Min } from 'class-validator';

export class UpdateSalePriceDto {
  @IsNumber()
  @Min(0)
  pricePerKg: number;
}