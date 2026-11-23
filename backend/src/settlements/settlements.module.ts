import { Module } from '@nestjs/common';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';
import { MigrationBackfillPreviewService } from './migration-backfill-preview.service';

@Module({
  controllers: [SettlementsController],
  providers: [SettlementsService, MigrationBackfillPreviewService],
})
export class SettlementsModule {}