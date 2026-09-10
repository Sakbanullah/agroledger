import { Module } from '@nestjs/common';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';

import { RubberWorkersModule } from '../rubber-workers/rubber-workers.module';

@Module({
  imports: [RubberWorkersModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}