import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsPositive,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

/** One scale load: a worker whose pieces were too many may have several. */
export class SaveScannedWeighingDto {
  @IsInt()
  @IsPositive()
  pieces: number;

  @IsNumber()
  @IsPositive()
  weightKg: number;
}

export class SaveScannedWorkerDto {
  @IsInt()
  @IsPositive()
  workerId: number;

  @IsArray()
  @ArrayMinSize(1)
  // ponytail: ceiling of 20 weighings per worker; raise if a real note needs more.
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SaveScannedWeighingDto)
  weighings: SaveScannedWeighingDto[];
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
