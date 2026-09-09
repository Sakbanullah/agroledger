import {
  IsInt,
  Min,
} from 'class-validator';

export class ConfirmSettlementDto {
  @IsInt()
  @Min(1)
  rubberWorkerId: number;
}