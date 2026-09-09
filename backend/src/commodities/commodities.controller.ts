import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CommoditiesService } from './commodities.service';
import { CreateCommodityDto } from './dto/create-commodity.dto';
import { UpdateCommodityDto } from './dto/update-commodity.dto';

@Controller('commodities')
export class CommoditiesController {
  constructor(private readonly commoditiesService: CommoditiesService) {}

  @Get()
  findAll() {
    return this.commoditiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commoditiesService.findOne(Number(id));
  }

  @Post()
  create(@Body() createCommodityDto: CreateCommodityDto) {
    return this.commoditiesService.create(createCommodityDto);
  }
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateCommodityDto: UpdateCommodityDto,
  ) {
    return this.commoditiesService.update(Number(id), updateCommodityDto);
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commoditiesService.remove(Number(id));
  }
}
