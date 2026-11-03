import { Module } from '@nestjs/common';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';

import { LlmModule } from '../llm/llm.module';
import { RubberWorkersModule } from '../rubber-workers/rubber-workers.module';

@Module({
  imports: [RubberWorkersModule, LlmModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
