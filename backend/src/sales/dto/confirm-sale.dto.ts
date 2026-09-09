import { IsOptional, IsString } from 'class-validator';

export class ConfirmSaleDto {
  @IsOptional()
  @IsString()
  buyerName?: string;
}