import { PartialType } from '@nestjs/mapped-types';
import { CreateRubberWorkerDto } from './create-rubber-worker.dto';

export class UpdateRubberWorkerDto extends PartialType(
  CreateRubberWorkerDto,
) {}