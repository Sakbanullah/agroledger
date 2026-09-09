import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { HarvestsService } from './harvests.service';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';

@Controller('harvests')
export class HarvestsController {
  constructor(private readonly harvestsService: HarvestsService) {}

  @Get()
  findAll() {
    return this.harvestsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.harvestsService.findOne(Number(id));
  }

  @Post()
  create(@Body() createHarvestDto: CreateHarvestDto) {
    return this.harvestsService.create(createHarvestDto);
  }
  @Put(':id')
  update(@Param('id') id: string, @Body() updateHarvestDto: UpdateHarvestDto) {
    return this.harvestsService.update(Number(id), updateHarvestDto);
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.harvestsService.remove(Number(id));
  }
}
