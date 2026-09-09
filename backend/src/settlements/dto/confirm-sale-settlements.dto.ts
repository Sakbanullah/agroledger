import { IsInt, Min } from 'class-validator';

export class ConfirmSaleSettlementsDto {
  @IsInt()
  @Min(1)
  saleId: number;
}