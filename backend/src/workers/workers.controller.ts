import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { WorkersService } from './workers.service';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  findAll() {
    return this.workersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workersService.findOne(Number(id));
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      phone?: string;
    },
  ) {
    return this.workersService.create(body.name, body.phone);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      phone?: string;
    },
  ) {
    return this.workersService.update(
      Number(id),
      body.name,
      body.phone,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workersService.remove(Number(id));
  }
}