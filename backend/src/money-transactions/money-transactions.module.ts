import { Module } from '@nestjs/common';
import { MoneyTransactionsController } from './money-transactions.controller';
import { MoneyTransactionsService } from './money-transactions.service';

@Module({
  controllers: [MoneyTransactionsController],
  providers: [MoneyTransactionsService],
})
export class MoneyTransactionsModule {}