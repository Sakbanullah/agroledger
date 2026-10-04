import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateFarmDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsIn(['OWN', 'RELATIVE'])
  ownershipType?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  ownerId?: number;
}