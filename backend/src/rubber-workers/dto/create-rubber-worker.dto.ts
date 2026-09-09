import {
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateRubberWorkerDto {
  @IsInt()
  @Min(1)
  saleId: number;

  @IsInt()
  @Min(1)
  workerId: number;

  @IsInt()
  @Min(1)
  pieces: number;

  @IsNumber()
  @Min(1)
  weightKg: number;
}