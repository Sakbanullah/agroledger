import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  MigrationPreview,
  MigrationPreviewReader,
  previewSettlementBackfill,
} from './migration-preview';

/**
 * Composition root for the backfill preview: wires the persistence adapter to
 * the read-only preview. It has exactly one use case and owns no business rule;
 * the classification lives in migration-classifier.ts.
 */
@Injectable()
export class MigrationBackfillPreviewService {
  constructor(private readonly prisma: PrismaService) {}

  preview(): Promise<MigrationPreview> {
    // The service exposes every method the preview calls; the cast only
    // narrows the overloaded $transaction to the read-only shape it uses.
    return previewSettlementBackfill(this.prisma as unknown as MigrationPreviewReader);
  }
}
