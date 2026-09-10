import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsPositive,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

export class SaveScannedWorkerDto {
  @IsInt()
  @IsPositive()
  workerId: number;

  @IsInt()
  @IsPositive()
  pieces: number;

  @IsNumber()
  @IsPositive()
  weightKg: number;
}

export class SaveScannedWorkersDto {
  @IsInt()
  @IsPositive()
  saleId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaveScannedWorkerDto)
  workers: SaveScannedWorkerDto[];
}