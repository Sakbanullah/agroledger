import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CreateOpeningBalanceDto } from './dto/create-opening-balance.dto';

import { MoneyTransactionsService } from './money-transactions.service';

import { CashFlowQueryDto } from './dto/cash-flow-query.dto';

import { CreateMoneyTransactionDto } from './dto/create-money-transaction.dto';

@Controller('money-transactions')
export class MoneyTransactionsController {
  constructor(
    private readonly moneyTransactionsService: MoneyTransactionsService,
  ) {}

  @Get()
  findAll() {
    return this.moneyTransactionsService.findAll();
  }

  @Get('cash-flow')
  getCashFlow(@Query() query: CashFlowQueryDto) {
    return this.moneyTransactionsService.getCashFlowByPeriod(
      new Date(query.startDate),
      new Date(query.endDate),
      query.period ?? 'daily',
    );
  }

  @Get('cash-flow/summary')
  getCashFlowSummary(@Query() query: CashFlowQueryDto) {
    return this.moneyTransactionsService.getCashFlowSummary(
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  @Get('cash-position')
  getCashPosition() {
    return this.moneyTransactionsService.getCashPosition();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.moneyTransactionsService.findOne(Number(id));
  }

  @Post('opening-balance')
  createOpeningBalance(
    @Body() createOpeningBalanceDto: CreateOpeningBalanceDto,
  ) {
    return this.moneyTransactionsService.createOpeningBalance(
      createOpeningBalanceDto,
    );
  }

  @Post()
  create(@Body() createMoneyTransactionDto: CreateMoneyTransactionDto) {
    return this.moneyTransactionsService.create(createMoneyTransactionDto);
  }
}
