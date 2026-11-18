import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsPositive,
  Min,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

export class SaveDraftWorkerDto {
  @IsInt()
  @IsPositive()
  workerId: number;

  /** 0 is allowed: a started draft row may not have its pieces yet. */
  @IsInt()
  @Min(0)
  pieces: number;

  /** 0 is allowed: a started draft row may not have its weight yet. */
  @IsOptional()
  @IsPositive()
  weightKg?: number;
}

export class SaveDraftWorkersDto {
  @IsInt()
  @IsPositive()
  saleId: number;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SaveDraftWorkerDto)
  workers: SaveDraftWorkerDto[];
}
