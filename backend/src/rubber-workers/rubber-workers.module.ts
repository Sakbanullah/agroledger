import { Module } from '@nestjs/common';
import { PeopleModule } from '../people/people.module';
import { RubberWorkersController } from './rubber-workers.controller';
import { RubberWorkersService } from './rubber-workers.service';

@Module({
  imports: [PeopleModule],
  controllers: [RubberWorkersController],
  providers: [RubberWorkersService],
  exports: [RubberWorkersService],
})
export class RubberWorkersModule {}