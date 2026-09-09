import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { FarmsService } from './farms.service';
import { CreateFarmDto } from './dto/create-farm.dto';
import { UpdateFarmDto } from './dto/update-farm.dto';

@Controller('farms')
export class FarmsController {
  constructor(private readonly farmsService: FarmsService) {}

  @Get()
  findAll() {
    return this.farmsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.farmsService.findOne(Number(id));
  }

  @Post()
  create(@Body() createFarmDto: CreateFarmDto) {
    return this.farmsService.create(createFarmDto);
  }
    @Put(':id')
    update(
    @Param('id') id: string,
    @Body() updateFarmDto: UpdateFarmDto,
  ) {
    return this.farmsService.update(Number(id), updateFarmDto);
  }
    @Delete(':id')
    remove(@Param('id') id: string) {
    return this.farmsService.remove(Number(id));
  }
}