import { Module } from '@nestjs/common';

import { FinancialExplorerController } from './financial-explorer.controller';
import { FinancialExplorerService } from './financial-explorer.service';

@Module({
  controllers: [FinancialExplorerController],
  providers: [FinancialExplorerService],
})
export class FinancialExplorerModule {}
