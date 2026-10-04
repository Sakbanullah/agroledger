import { IsNumber, Min } from 'class-validator';

export class PayOwnerSettlementDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}
