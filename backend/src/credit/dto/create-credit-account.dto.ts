import { IsInt, Min } from 'class-validator';

export class CreateCreditAccountDto {
  @IsInt()
  @Min(1)
  personId: number;
}