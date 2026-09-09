import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCommodityDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  unit?: string;
}