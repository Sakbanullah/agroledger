import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PERSON_TYPE_RELATIVE_OWNER,
  PERSON_TYPE_WORKER,
} from '../person-type.constants';

export class CreatePersonDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @IsIn([PERSON_TYPE_WORKER, PERSON_TYPE_RELATIVE_OWNER])
  type?: string;
}