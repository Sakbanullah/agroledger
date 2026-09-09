import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePersonDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  type?: string;
}