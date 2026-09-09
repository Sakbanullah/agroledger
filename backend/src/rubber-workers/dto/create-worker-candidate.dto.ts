import { IsString, Length } from 'class-validator';

export class CreateWorkerCandidateDto {
  @IsString()
  @Length(2, 100)
  name: string;
}