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
  @Min(0)
  pieces: number;

  @IsNumber()
  @Min(0)
  weightKg: number;
}