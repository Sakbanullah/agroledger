import { Module } from '@nestjs/common';

import { PeopleModule } from '../people/people.module';
import { WorkersController } from './workers.controller';
import { WorkersService } from './workers.service';

@Module({
  imports: [PeopleModule],
  controllers: [WorkersController],
  providers: [WorkersService],
})
export class WorkersModule {}