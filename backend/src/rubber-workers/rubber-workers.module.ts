import { Module } from '@nestjs/common';
import { RubberWorkersController } from './rubber-workers.controller';
import { RubberWorkersService } from './rubber-workers.service';

@Module({
  controllers: [RubberWorkersController],
  providers: [RubberWorkersService],
  exports: [RubberWorkersService],
})
export class RubberWorkersModule {}