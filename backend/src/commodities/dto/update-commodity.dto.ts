import { PartialType } from '@nestjs/mapped-types';
import { CreateCommodityDto } from './create-commodity.dto';

export class UpdateCommodityDto extends PartialType(CreateCommodityDto) {}