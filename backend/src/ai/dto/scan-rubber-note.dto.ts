import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

export class RubberNoteWorkerDto {
  @IsOptional()
  @IsString()
  name: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  pieces: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg: number | null;
}

export class RubberNoteResultDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubberNoteWorkerDto)
  workers: RubberNoteWorkerDto[];
}