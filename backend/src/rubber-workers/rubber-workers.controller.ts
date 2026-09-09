import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { RubberWorkersService } from './rubber-workers.service';
import { CreateRubberWorkerDto } from './dto/create-rubber-worker.dto';
import { UpdateRubberWorkerDto } from './dto/update-rubber-worker.dto';
import { CreateWorkerCandidateDto } from './dto/create-worker-candidate.dto';

@Controller('rubber-workers')
export class RubberWorkersController {
  constructor(private readonly rubberWorkersService: RubberWorkersService) {}

  @Get()
  findAll() {
    return this.rubberWorkersService.findAll();
  }

  @Get('match')
  match(@Query('name') name: string) {
    return this.rubberWorkersService.match(name);
  }

  @Get('fuzzy-match')
  fuzzyMatch(@Query('name') name: string) {
    return this.rubberWorkersService.fuzzyMatch(name);
  }

  @Post('candidate/confirm')
  confirmCandidate(@Body() createWorkerCandidateDto: CreateWorkerCandidateDto) {
    return this.rubberWorkersService.createFromCandidate(
      createWorkerCandidateDto,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rubberWorkersService.findOne(Number(id));
  }

  @Post()
  create(@Body() createRubberWorkerDto: CreateRubberWorkerDto) {
    return this.rubberWorkersService.create(createRubberWorkerDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateRubberWorkerDto: UpdateRubberWorkerDto,
  ) {
    return this.rubberWorkersService.update(Number(id), updateRubberWorkerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rubberWorkersService.remove(Number(id));
  }
}
