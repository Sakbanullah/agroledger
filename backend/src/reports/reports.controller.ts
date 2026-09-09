import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';

import { ReportsService } from './reports.service';
import { CashFlowQueryDto } from '../money-transactions/dto/cash-flow-query.dto';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
  ) {}

  @Get('finance')
  getFinanceSummary(
    @Query() query: CashFlowQueryDto,
  ) {
    return this.reportsService.getFinanceSummary(
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  @Get('sales')
  getSalesSummary(
    @Query() query: CashFlowQueryDto,
  ) {
    return this.reportsService.getSalesSummary(
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  @Get('settlements')
  getSettlementSummary(
    @Query() query: CashFlowQueryDto,
  ) {
    return this.reportsService.getSettlementSummary(
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  @Get('dashboard')
  getDashboardSummary() {
    return this.reportsService.getDashboardSummary();
  }
}