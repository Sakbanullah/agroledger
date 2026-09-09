import {
  IsDateString,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateHarvestDto {
  @IsInt()
  @Min(1)
  farmId: number;

  @IsInt()
  @Min(1)
  commodityId: number;

  @IsDateString()
  harvestDate: string;

  @IsNumber()
  @Min(0)
  weightKg: number;
}