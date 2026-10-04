import { Module } from '@nestjs/common';
import { OwnerSettlementsController } from './owner-settlements.controller';
import { OwnerSettlementsService } from './owner-settlements.service';

@Module({
  controllers: [OwnerSettlementsController],
  providers: [OwnerSettlementsService],
})
export class OwnerSettlementsModule {}