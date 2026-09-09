import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSaleDto {
  @IsInt()
  @Min(1)
  farmId: number;

  @IsInt()
  @Min(1)
  commodityId: number;

  @IsDateString()
  saleDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerKg?: number;

  @IsNumber()
  @Min(0)
  totalWeightKg: number;

  @IsOptional()
  @IsString()
  buyerName?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}