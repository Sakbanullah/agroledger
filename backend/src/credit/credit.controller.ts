import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CreditService } from './credit.service';
import { CreateCreditAccountDto } from './dto/create-credit-account.dto';
import { CreateCreditTransactionDto } from './dto/create-credit-transaction.dto';
import { CreateDebtDto } from './dto/create-debt.dto';

@Controller('credit')
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  @Get('accounts')
  findAllAccounts() {
    return this.creditService.findAllAccounts();
  }

  @Get('accounts/:id')
  findAccount(@Param('id') id: string) {
    return this.creditService.findAccount(Number(id));
  }

  @Post('accounts')
  createAccount(
    @Body() createCreditAccountDto: CreateCreditAccountDto,
  ) {
    return this.creditService.createAccount(createCreditAccountDto);
  }

  @Post('transactions')
  createTransaction(
    @Body()
    createCreditTransactionDto: CreateCreditTransactionDto,
  ) {
    return this.creditService.createTransaction(
      createCreditTransactionDto,
    );
  }

  @Post('debt')
  createDebt(@Body() createDebtDto: CreateDebtDto) {
    return this.creditService.createDebt(createDebtDto);
  }

  @Get('accounts/:id/outstanding')
  getOutstandingBalance(@Param('id') id: string) {
    return this.creditService.getOutstandingBalance(Number(id));
  }
}