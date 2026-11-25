import { Controller, Get, Param, ParseIntPipe, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import { FinancialExplorerService } from './financial-explorer.service';

import { FinancialExplorerQueryDto } from './dto/financial-explorer-query.dto';
import { CashFlowQueryDto } from './dto/cash-flow-query.dto';

/**
 * Financial Explorer endpoints. Read-only by design: every number here is
 * derived from MoneyTransaction, the same rows /reports and the cash-position
 * page read.
 */
@Controller('financial-explorer')
export class FinancialExplorerController {
  constructor(private readonly service: FinancialExplorerService) {}

  @Get('summary')
  summary(@Query() query: FinancialExplorerQueryDto) {
    return this.service.getSummary(query);
  }

  @Get('cash-flow')
  cashFlow(@Query() query: CashFlowQueryDto) {
    return this.service.getCashFlow(query);
  }

  @Get('income/daily')
  incomeDaily(@Query() query: FinancialExplorerQueryDto) {
    return this.service.getDaily('IN', query);
  }

  @Get('expenses/daily')
  expenseDaily(@Query() query: FinancialExplorerQueryDto) {
    return this.service.getDaily('OUT', query);
  }

  @Get('categories')
  categories(@Query() query: FinancialExplorerQueryDto) {
    return this.service.getCategories(query);
  }

  @Get('transactions')
  transactions(@Query() query: FinancialExplorerQueryDto) {
    return this.service.getTransactions(query);
  }

  @Get('transactions/export')
  async exportTransactions(
    @Query() query: FinancialExplorerQueryDto,
    @Res() response: Response,
  ) {
    const startDate = query.startDate.slice(0, 10);
    const endDate = query.endDate.slice(0, 10);

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="financial-explorer-${startDate}_${endDate}.csv"`,
    );
    response.setHeader('Cache-Control', 'no-store');

    try {
      for await (const chunk of this.service.streamTransactionsCsv(query)) {
        response.write(chunk);
      }
      response.end();
    } catch (error) {
      response.destroy(error instanceof Error ? error : undefined);
    }
  }

  @Get('transactions/:id')
  transaction(@Param('id', ParseIntPipe) id: number) {
    return this.service.getDetail(id);
  }

  @Get('transactions/:id/trace')
  trace(@Param('id', ParseIntPipe) id: number) {
    return this.service.getTrace(id);
  }
}
