import {
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateRubberWorkerDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  pieces?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  weightKg?: number;
}